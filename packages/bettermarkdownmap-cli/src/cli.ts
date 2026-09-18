import { program } from 'commander';
import { readFile } from 'fs/promises';
import open from 'open';
import { basename } from 'path';
import { readPackageUp } from 'read-package-up';
import { fileURLToPath } from 'url';
import { createBetterMarkdownMap } from '.';
import { develop } from './util/dev-server';

async function main() {
  const pkg = (
    await readPackageUp({
      cwd: fileURLToPath(import.meta.url),
    })
  )?.packageJson;
  if (!pkg) throw new Error('Invalid package');

  program
    .version(pkg.version)
    .description('Create a bettermarkdownmap from a Markdown input file')
    .arguments('<input>')
    .option('--no-open', 'Do not open the output file after generation')
    .option('--no-toolbar', 'Do not show toolbar')
    .option('-o, --output <output>', 'Specify the filename of the output HTML')
    .option(
      '-w, --watch',
      'Watch the input file and update output on the fly, note that this feature is for development only',
    )
    .option('--port <port>', 'Set the port for the devServer to listen')
    .action(async (input: string, cmd) => {
      const content = await readFile(input, 'utf8');
      const output = cmd.output || `${input.replace(/\.\w*$/, '')}.html`;
      if (cmd.watch) {
        const devServer = await develop({
          toolbar: cmd.toolbar,
          port: +cmd.port || undefined,
        });
        const address = devServer.serverInfo!.address;
        const provider = devServer.addProvider({ filePath: input });
        const filename = basename(input);
        const url = `http://localhost:${address.port}/?key=${provider.key}&filename=${encodeURIComponent(filename)}`;
        console.log(`Listening at ${url}`);
        if (cmd.open) open(url);
      } else {
        await createBetterMarkdownMap({
          content,
          output,
          open: cmd.open,
          toolbar: cmd.toolbar,
        });
      }
    });
  program.parse();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
