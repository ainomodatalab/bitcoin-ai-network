import { getBitcoinBlockHeaderByHeight } from '@meta-protocols-oracle/bitcoin';
import { Command } from '@oclif/core';

export default class World extends Command {
  static description = 'a command';

  async run(): Promise<void> {
    for (let i = 820080; i < 820088; i++) {
      const header = await getBitcoinBlockHeaderByHeight(i);
      console.log(`header ${i}: ${JSON.stringify(header)}`);
    }
  }
}
