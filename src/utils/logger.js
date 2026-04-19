import chalk from 'chalk';

export const log = {
  info:    (msg) => console.log(chalk.cyan('ℹ'),  chalk.white(msg)),
  success: (msg) => console.log(chalk.green('✔'), chalk.greenBright(msg)),
  warn:    (msg) => console.log(chalk.yellow('⚠'), chalk.yellow(msg)),
  error:   (msg) => console.error(chalk.red('✖'), chalk.redBright(msg)),
  dim:     (msg) => console.log(chalk.dim(msg)),
};
