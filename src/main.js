import chalk from "chalk";
import fs from "fs";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import execa from "execa";
import listr from "listr";
import { projectInstall } from "pkg-install";

const access = promisify(fs.access);
const copy = promisify(ncp);

const copyTemplateFiles = async options => {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
};

const createProject = async options => {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd()
  };
  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    "../../templates",
    options.template.toLowerCase()
  );
  options.templateDirectory = templateDir;
  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.log("%S Invalid template name", chalk.red.bold("ERROR"));
    process.exit(1);
  }

  const tasks = new listr([
    {
      title: "Copy project files",
      task: () => copyTemplateFiles(options)
    },
    {
      title: "initialize git",
      task: () => initGit(options),
      enabled: () => options.git
    },
    {
      title: "install dependencies",
      task: () => projectInstall({ cwd: options.targetDirectory }),
      skip: () => (!options.runInstall ? "Pass" : undefined)
    }
  ]);
  await tasks.run();
  console.log("%s project ready", chalk.green.bold("DONE"));
  return true;
};

const initGit = async options => {
  const result = await execa("git", ["init"], {
    cwd: options.targetDirectory
  });
  if (result.failed) {
    return Promise.reject(new Error("Failed to initialize Git"));
  }
  return;
};

export default createProject;
