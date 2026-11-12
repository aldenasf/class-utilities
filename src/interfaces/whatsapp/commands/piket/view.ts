import { Command, CommandContext } from '../../types.js';
import { PiketService } from '../../../../core/services/piket.service.js';

export const command: Command = {
  name: 'piket',
  aliases: ['kebersihan'],
  category: 'piket',
  description: 'Tampilkan petugas piket kelas (.piket [hari])',
  execute: async (ctx: CommandContext) => {
    const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    let targetDay = new Date().getDay();

    if (ctx.args[0]) {
      const idx = dayNames.indexOf(ctx.args[0].toLowerCase());
      if (idx !== -1) targetDay = idx;
    }

    const piketList = await PiketService.getPiketForDay(targetDay);
    const capDay = dayNames[targetDay].toUpperCase();

    if (piketList.length === 0) {
      await ctx.reply(`🧹 *Jadwal Piket Hari ${capDay}:*\n_Belum ada petugas piket yang diatur._`);
      return;
    }

    const lines = [`🧹 *Petugas Piket Hari ${capDay}:*`];
    piketList.forEach((student, idx) => {
      lines.push(`${idx + 1}. ${student}`);
    });

    await ctx.reply(lines.join('\n'));
  },
};
export default command;
