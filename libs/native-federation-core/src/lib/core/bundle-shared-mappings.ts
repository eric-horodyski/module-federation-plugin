import * as path from 'path';
import * as fs from 'fs';
import { NormalizedFederationConfig } from '../config/federation-config';
import { bundle } from '../utils/build-utils';
import { SharedInfo } from '@softarc/native-federation-runtime';
import { hashFile } from '../utils/hash-file';
import { FederationOptions } from '../core/federation-options';
import { logger } from '../utils/logger';
import { normalize } from '../utils/normalize';

export async function bundleSharedMappings(
  config: NormalizedFederationConfig,
  fedOptions: FederationOptions,
  externals: string[]
): Promise<Array<SharedInfo>> {
  const result: Array<SharedInfo> = [];

  for (const m of config.sharedMappings) {
    const key = m.key.replace(/[^A-Za-z0-9]/g, '_');
    const outFileName = key + '.js';
    const outFilePath = path.join(fedOptions.outputPath, outFileName);

    logger.info('Bundling shared mapping ' + m.key);

    try {
      await bundle({
        entryPoint: m.path,
        tsConfigPath: findTsConfig(m.path) ?? fedOptions.tsConfig,
        external: externals,
        outfile: outFilePath,
        mappedPaths: [],
        kind: 'shared-mapping',
      });

      const hash = hashFile(outFilePath);
      const hashedOutFileName = `${key}-${hash}.js`;
      const hashedOutFilePath = path.join(
        fedOptions.outputPath,
        hashedOutFileName
      );
      fs.renameSync(outFilePath, hashedOutFilePath);

      result.push({
        packageName: m.key,
        outFileName: hashedOutFileName,
        requiredVersion: '',
        singleton: true,
        strictVersion: false,
        version: '',
        debug: !fedOptions.debug ? undefined : {
          entryPoint: normalize(m.path)
        }
      });
    } catch (e) {
      // TODO: add logger
      logger.error('Error bundling shared mapping ' + m.key);
      logger.notice(
        `If you don't need this mapping to shared, you can skip it in your federation.config.js`
      );
      logger.error(e);
    }
  }

  return result;
}

function findTsConfig(folder: string): string | null {
  while (
    !fs.existsSync(path.join(folder, 'tsconfig.lib.json')) &&
    !fs.existsSync(path.join(folder, 'tsconfig.json')) &&
    !fs.existsSync(path.join(folder, 'tsconfig.base.json')) &&
    path.dirname(folder) !== folder
  ) {
    folder = path.dirname(folder);
  }

  const filePathOption0 = path.join(folder, 'tsconfig.lib.json');
  if (fs.existsSync(filePathOption0)) {
    return filePathOption0;
  }

  const filePathOption1 = path.join(folder, 'tsconfig.json');
  if (fs.existsSync(filePathOption1)) {
    return filePathOption1;
  }

  const filePathOption2 = path.join(folder, 'tsconfig.base.json');
  if (fs.existsSync(filePathOption2)) {
    return filePathOption2;
  }

  return null;
}
