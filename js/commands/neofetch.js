export const neofetch = {
  helpText: 'Display system and portfolio information in a beautiful layout.',
  run: async (args, shell) => {
    // 1. Calculate Uptime
    const totalSeconds = Math.floor(performance.now() / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let uptimeStr = "";
    if (hours > 0) uptimeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) uptimeStr += `${minutes}m `;
    uptimeStr += `${seconds}s`;

    // 2. Detect Browser
    let browser = "Unknown";
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("OPR")) browser = "Opera";
    const match = ua.match(/(Chrome|Safari|Firefox|Edge|Edg|OPR)\/([\d.]+)/);
    if (match) {
      browser = `${browser} ${match[2].split('.')[0]}`;
    }

    // 3. Count VFS nodes recursively
    const countNodes = (node) => {
      if (typeof node !== 'object') return 1; // File
      let count = 0;
      for (const key of Object.keys(node)) {
        count += 1 + countNodes(node[key]);
      }
      return count;
    };
    const totalFiles = countNodes(shell.fileSystem.root);

    // 4. Color Blocks
    const blocks = [
      '<span class="color-red">██</span>',
      '<span class="green">██</span>',
      '<span class="yellow">██</span>',
      '<span class="blue">██</span>',
      '<span class="magenta">██</span>',
      '<span class="cyan">██</span>',
      '<span class="white">██</span>'
    ].join(" ");

    // 5. Logo & Stats Arrays
    const logoLines = [
      "",
      "                     @",
      "                    @@@",
      "                   @@@@@",
      "                  @@@@@@@",
      "                 @@@@@@@@@",
      "                @@@@@@@@@@@",
      "               @@@@@@ @@@@@@",
      "                       @@@@@@",
      "                        @@@@@@",
      "                         @@@@@@",
      "           <span class=\"blue\">#########</span>      @@@@@@",
      "          <span class=\"blue\">############</span>     @@@@@@",
      "         <span class=\"blue\">######</span>             @@@@@@",
      "        <span class=\"blue\">######</span>               @@@@@@",
      "       <span class=\"blue\">######</span>                 @@@@@@",
      "      <span class=\"blue\">######</span>                   @@@@@@",
      "     <span class=\"blue\">######</span>                     @@@@@@",
      ""
    ];

    const stats = [
      `<span class="color-accent">${shell.currentUsername}</span>@<span class="color-accent">chenghao.li</span>`,
      "-".repeat(`${shell.currentUsername}@chenghao.li`.length),
      `<span class="blue">OS</span>:          Arch Linux x86_64`,
      `<span class="blue">Host</span>:        chenghao.li portfolio`,
      `<span class="blue">Kernel</span>:      6.9.3-arch1-1`,
      `<span class="blue">Uptime</span>:      ${uptimeStr}`,
      `<span class="blue">Shell</span>:       ArchaicSh 1.0`,
      `<span class="blue">Resolution</span>:  ${window.screen.width}x${window.screen.height}`,
      `<span class="blue">Browser</span>:     ${browser}`,
      `<span class="blue">Virtual FS</span>:  ${totalFiles} nodes`,
      `<span class="blue">Memory</span>:      12% of ${navigator.deviceMemory || 64}GB`,
      "",
      blocks
    ];

    // Align logo and stats side-by-side
    let output = "\n";
    const maxLines = Math.max(logoLines.length, stats.length);
    for (let i = 0; i < maxLines; i++) {
      const logoLineRaw = logoLines[i] || "";
      const statsLine = stats[i] || "";

      // Strip tags to calculate real text padding size
      const visibleLogoLength = logoLineRaw.replace(/<[^>]*>/g, '').length;
      const padding = " ".repeat(Math.max(0, 45 - visibleLogoLength));

      output += logoLineRaw + padding + statsLine + "\n";
    }

    shell.print(`<pre style="font-family: inherit; line-height: 1.25; margin: 0;">${output}</pre>`, 'color-accent');
  }
};
