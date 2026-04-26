#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const DEFAULT_ENV_PATH = join(homedir(), ".config", "hermes", "secrets", "linear.env");

const COMMANDS = new Set([
  "list-teams",
  "list-projects",
  "list-open-issues",
  "create-issue",
  "add-comment",
  "mark-done",
  "help",
  "--help",
  "-h",
]);

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

async function main() {
  loadEnvFile(DEFAULT_ENV_PATH);

  const [command = "help", ...argv] = process.argv.slice(2);
  if (!COMMANDS.has(command)) {
    throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  const options = parseArgs(argv);
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      `LINEAR_API_KEY is not set. Add it to the environment or ${DEFAULT_ENV_PATH}.`
    );
  }

  const client = createLinearClient(apiKey);

  if (command === "list-teams") {
    await listTeams(client);
    return;
  }

  if (command === "list-projects") {
    await listProjects(client);
    return;
  }

  if (command === "list-open-issues") {
    await listOpenIssues(client, options);
    return;
  }

  if (command === "create-issue") {
    await createIssue(client, options);
    return;
  }

  if (command === "add-comment") {
    await addComment(client, options);
    return;
  }

  if (command === "mark-done") {
    await markDone(client, options);
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    process.env[key] = unquoteEnvValue(rawValue.trim());
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawKey}`);
    }

    options[key] = value;
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return options;
}

function createLinearClient(apiKey) {
  return async function graphql(query, variables = {}) {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Linear API request failed with HTTP ${response.status}.`);
    }

    if (payload?.errors?.length) {
      const messages = payload.errors.map((error) => error.message).join("; ");
      throw new Error(`Linear API error: ${messages}`);
    }

    return payload.data;
  };
}

async function listTeams(client) {
  const data = await client(`
    query ListTeams {
      teams(first: 100) {
        nodes {
          id
          key
          name
        }
      }
    }
  `);

  printRows(
    data.teams.nodes.map((team) => ({
      key: team.key,
      name: team.name,
      id: team.id,
    }))
  );
}

async function listProjects(client) {
  const data = await client(`
    query ListProjects {
      projects(first: 100, includeArchived: false) {
        nodes {
          id
          name
          url
          status {
            name
            type
          }
        }
      }
    }
  `);

  printRows(
    data.projects.nodes.map((project) => ({
      name: project.name,
      status: project.status?.name || "-",
      type: project.status?.type || "-",
      url: project.url,
    }))
  );
}

async function listOpenIssues(client, options) {
  const team = options.team ? await findTeam(client, options.team) : null;
  const filter = {
    state: {
      type: {
        nin: ["completed", "canceled"],
      },
    },
  };

  if (team) {
    filter.team = { id: { eq: team.id } };
  }

  const data = await client(
    `
      query ListOpenIssues($filter: IssueFilter) {
        issues(first: 100, filter: $filter, includeArchived: false) {
          nodes {
            identifier
            title
            url
            priority
            state {
              name
              type
            }
            team {
              key
            }
          }
        }
      }
    `,
    { filter }
  );

  printRows(
    data.issues.nodes.map((issue) => ({
      id: issue.identifier,
      team: issue.team?.key || "-",
      state: issue.state?.name || "-",
      priority: issue.priority || 0,
      title: issue.title,
      url: issue.url,
    }))
  );
}

async function createIssue(client, options) {
  requireOption(options, "team");
  requireOption(options, "title");

  const team = await findTeam(client, options.team);
  const project = options.project ? await findProject(client, options.project) : null;
  const state = options.state ? await findWorkflowState(client, team.id, options.state) : null;

  const input = {
    teamId: team.id,
    title: options.title,
  };

  if (options.description) {
    input.description = options.description;
  }

  if (project) {
    input.projectId = project.id;
  }

  if (state) {
    input.stateId = state.id;
  }

  const data = await client(
    `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            identifier
            title
            url
            state {
              name
            }
          }
        }
      }
    `,
    { input }
  );

  if (!data.issueCreate.success) {
    throw new Error("Linear did not create the issue.");
  }

  printRows([
    {
      id: data.issueCreate.issue.identifier,
      state: data.issueCreate.issue.state?.name || "-",
      title: data.issueCreate.issue.title,
      url: data.issueCreate.issue.url,
    },
  ]);
}

async function addComment(client, options) {
  requireOption(options, "issue");
  requireOption(options, "body");

  const issue = await findIssue(client, options.issue);
  const data = await client(
    `
      mutation AddComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
          }
        }
      }
    `,
    {
      input: {
        issueId: issue.id,
        body: options.body,
      },
    }
  );

  if (!data.commentCreate.success) {
    throw new Error("Linear did not create the comment.");
  }

  printRows([{ issue: issue.identifier, commentId: data.commentCreate.comment.id }]);
}

async function markDone(client, options) {
  requireOption(options, "issue");

  const issue = await findIssue(client, options.issue);
  if (issue.state?.type === "completed") {
    printRows([{ id: issue.identifier, state: issue.state.name, title: issue.title, result: "already done" }]);
    return;
  }

  const doneState = await findWorkflowState(client, issue.team.id, options.state || "Done", "completed");
  const data = await client(
    `
      mutation MarkIssueDone($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            identifier
            title
            url
            state {
              name
              type
            }
          }
        }
      }
    `,
    {
      id: issue.id,
      input: {
        stateId: doneState.id,
      },
    }
  );

  if (!data.issueUpdate.success) {
    throw new Error("Linear did not update the issue.");
  }

  printRows([
    {
      id: data.issueUpdate.issue.identifier,
      state: data.issueUpdate.issue.state?.name || "-",
      title: data.issueUpdate.issue.title,
      url: data.issueUpdate.issue.url,
    },
  ]);
}

async function findTeam(client, value) {
  const data = await client(
    `
      query FindTeam {
        teams(first: 100) {
          nodes {
            id
            key
            name
          }
        }
      }
    `
  );

  const needle = value.toLowerCase();
  const team = data.teams.nodes.find(
    (candidate) =>
      candidate.id === value ||
      candidate.key?.toLowerCase() === needle ||
      candidate.name?.toLowerCase() === needle
  );

  if (!team) {
    throw new Error(`No Linear team found for "${value}".`);
  }

  return team;
}

async function findProject(client, value) {
  const data = await client(
    `
      query FindProject($filter: ProjectFilter) {
        projects(first: 100, filter: $filter, includeArchived: false) {
          nodes {
            id
            name
          }
        }
      }
    `,
    { filter: { name: { containsIgnoreCase: value } } }
  );

  const needle = value.toLowerCase();
  const project =
    data.projects.nodes.find((candidate) => candidate.id === value) ||
    data.projects.nodes.find((candidate) => candidate.name.toLowerCase() === needle) ||
    data.projects.nodes[0];

  if (!project) {
    throw new Error(`No Linear project found for "${value}".`);
  }

  return project;
}

async function findIssue(client, value) {
  const data = await client(
    `
      query FindIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state {
            name
            type
          }
          team {
            id
            key
            name
          }
        }
      }
    `,
    { id: value }
  );

  if (!data.issue) {
    throw new Error(`No Linear issue found for "${value}".`);
  }

  return data.issue;
}

async function findWorkflowState(client, teamId, value, requiredType = null) {
  const data = await client(
    `
      query FindWorkflowStates($filter: WorkflowStateFilter) {
        workflowStates(first: 100, filter: $filter) {
          nodes {
            id
            name
            type
          }
        }
      }
    `,
    {
      filter: {
        team: { id: { eq: teamId } },
      },
    }
  );

  const needle = value.toLowerCase();
  const states = requiredType
    ? data.workflowStates.nodes.filter((state) => state.type === requiredType)
    : data.workflowStates.nodes;
  const state =
    states.find((candidate) => candidate.id === value) ||
    states.find((candidate) => candidate.name.toLowerCase() === needle) ||
    states.find((candidate) => candidate.type === requiredType) ||
    null;

  if (!state) {
    const qualifier = requiredType ? ` ${requiredType}` : "";
    throw new Error(`No${qualifier} Linear state found for "${value}".`);
  }

  return state;
}

function requireOption(options, key) {
  if (!options[key]) {
    throw new Error(`Missing required option --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
}

function printRows(rows) {
  if (!rows.length) {
    console.log("No results.");
    return;
  }

  console.log(JSON.stringify(rows, null, 2));
}

function usage() {
  return `Usage:
  node scripts/linear.mjs list-teams
  node scripts/linear.mjs list-projects
  node scripts/linear.mjs list-open-issues [--team EKA]
  node scripts/linear.mjs create-issue --team EKA --title "Issue title" [--description "..."] [--project "Prompt Library App"] [--state Backlog]
  node scripts/linear.mjs add-comment --issue EKA-123 --body "Comment text"
  node scripts/linear.mjs mark-done --issue EKA-123 [--state Done]

Environment:
  LINEAR_API_KEY can be set in the shell or in ${DEFAULT_ENV_PATH}.`;
}
