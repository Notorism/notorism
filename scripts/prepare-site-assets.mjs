import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const assetDirectory = path.resolve('site/assets');
const sourceDirectory = path.resolve('.research/sculptures');
await mkdir(assetDirectory, { recursive: true });

const jobs = [
  { source: 'david-head.jpg', output: 'david', width: 1200, mask: 'dark', crop: [0.1, 0, 0.78, 1] },
  { source: 'david-head.jpg', output: 'eye', width: 1100, mask: 'none', crop: [0.36, 0.24, 0.42, 0.29] },
  { source: 'david-head.jpg', output: 'gaze', width: 1100, mask: 'none', crop: [0.40, 0.29, 0.39, 0.155] },
  { source: 'hebe.jpg', output: 'hebe', width: 780, mask: 'figure', crop: [0.23, 0.075, 0.55, 0.88] },
  { source: 'hand.jpg', output: 'hand', width: 1400, mask: 'hand', crop: [0.09, 0.235, 0.825, 0.525] },
  { source: 'pointing-hand.jpg', output: 'pointing-hand', width: 680, mask: 'pointing', crop: [0.1, 0.065, 0.775, 0.875] },
  ...['swiss-design', 'brutalism', 'dithering', 'constructivism', 'editorial-layout', 'art-deco'].map((style, index) => ({
    source: path.resolve('payload/library/images/' + style + '/example-0' + (index % 3 + 1) + '.png'),
    output: 'study-' + (index + 1), width: 640, mask: 'none', crop: [0, 0, 1, 1], study: true
  }))
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    const sourceFile = path.isAbsolute(job.source) ? job.source : path.join(sourceDirectory, job.source);
    const data = await readFile(sourceFile);
    const mime = sourceFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const result = await page.evaluate(async ({ job, imageUrl }) => {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      const [x, y, w, h] = job.crop;
      const width = job.width;
      const height = Math.round(width * image.height * h / (image.width * w));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas processing is unavailable');
      context.drawImage(image, image.width * x, image.height * y, image.width * w, image.height * h, 0, 0, width, height);

      if (job.mask === 'pointing') {
        // Trace the original marble fragment; preserve the photographic surface.
        const mask = document.createElement('canvas');
        mask.width = width; mask.height = height;
        const pen = mask.getContext('2d');
        pen.setTransform(width / (1280 * w), 0, 0, height / (1949 * h), -x * width / w, -y * height / h);
        pen.fillStyle = '#fff';
        pen.beginPath();
        pen.moveTo(582, 337);
        pen.bezierCurveTo(558, 208, 580, 159, 648, 154);
        pen.bezierCurveTo(720, 153, 755, 188, 767, 258);
        pen.lineTo(823, 571);
        pen.bezierCurveTo(858, 600, 874, 680, 898, 815);
        pen.bezierCurveTo(936, 855, 952, 946, 983, 1036);
        pen.bezierCurveTo(1028, 1137, 1108, 1193, 1102, 1293);
        pen.bezierCurveTo(1094, 1521, 1073, 1787, 995, 1843);
        pen.bezierCurveTo(796, 1880, 534, 1840, 340, 1832);
        pen.bezierCurveTo(247, 1820, 213, 1747, 209, 1678);
        pen.bezierCurveTo(185, 1614, 173, 1523, 179, 1438);
        pen.bezierCurveTo(159, 1371, 141, 1299, 162, 1241);
        pen.bezierCurveTo(177, 1195, 211, 1174, 257, 1147);
        pen.bezierCurveTo(265, 1071, 271, 991, 315, 936);
        pen.bezierCurveTo(337, 910, 349, 907, 373, 897);
        pen.bezierCurveTo(355, 802, 372, 741, 402, 695);
        pen.bezierCurveTo(440, 635, 493, 624, 533, 639);
        pen.bezierCurveTo(576, 655, 619, 705, 644, 758);
        pen.lineTo(662, 694); pen.lineTo(608, 449);
        pen.closePath(); pen.fill();
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(mask, 0, 0);
        context.globalCompositeOperation = 'source-over';
      }

      if (job.mask === 'hand') {
        // Anatomical silhouette traced from the museum photograph, never a substitute drawing.
        const mask = document.createElement('canvas');
        mask.width = width; mask.height = height;
        const pen = mask.getContext('2d');
        pen.setTransform(width / (1941 * w), 0, 0, height / (1280 * h), -x * width / w, -y * height / h);
        pen.fillStyle = '#fff';
        pen.beginPath();
        pen.moveTo(205, 605);
        pen.bezierCurveTo(250, 500, 297, 484, 370, 478);
        pen.bezierCurveTo(630, 500, 916, 436, 1245, 420);
        pen.bezierCurveTo(1320, 407, 1335, 352, 1360, 314);
        pen.bezierCurveTo(1393, 298, 1414, 340, 1390, 400);
        pen.bezierCurveTo(1376, 451, 1356, 474, 1292, 495);
        pen.bezierCurveTo(1450, 480, 1560, 494, 1624, 506);
        pen.bezierCurveTo(1668, 523, 1669, 584, 1635, 602);
        pen.bezierCurveTo(1540, 631, 1450, 617, 1330, 629);
        pen.bezierCurveTo(1445, 655, 1557, 690, 1627, 680);
        pen.bezierCurveTo(1730, 676, 1756, 728, 1752, 763);
        pen.bezierCurveTo(1735, 789, 1710, 779, 1670, 781);
        pen.bezierCurveTo(1600, 842, 1490, 920, 1390, 949);
        pen.bezierCurveTo(1300, 981, 1230, 963, 1150, 948);
        pen.bezierCurveTo(947, 929, 764, 897, 664, 859);
        pen.bezierCurveTo(505, 827, 412, 830, 298, 833);
        pen.bezierCurveTo(224, 828, 175, 730, 205, 605);
        pen.closePath(); pen.fill();
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(mask, 0, 0);
        context.globalCompositeOperation = 'source-over';
      }

      if (job.mask === 'figure') {
        const mask = document.createElement('canvas');
        mask.width = width; mask.height = height;
        const pen = mask.getContext('2d');
        pen.setTransform(width / (1280 * w), 0, 0, height / (1920 * h), -x * width / w, -y * height / h);
        pen.fillStyle = '#fff';
        pen.beginPath();
        pen.moveTo(544, 238);
        pen.bezierCurveTo(550, 137, 729, 144, 738, 249);
        pen.bezierCurveTo(743, 307, 719, 382, 689, 394);
        pen.bezierCurveTo(690, 425, 734, 433, 764, 438);
        pen.bezierCurveTo(799, 451, 796, 491, 813, 519);
        pen.lineTo(823, 509);
        pen.bezierCurveTo(781, 483, 775, 457, 810, 454);
        pen.bezierCurveTo(835, 451, 897, 451, 932, 458);
        pen.bezierCurveTo(939, 472, 923, 507, 902, 512);
        pen.bezierCurveTo(911, 547, 876, 572, 870, 579);
        pen.bezierCurveTo(869, 611, 905, 696, 887, 728);
        pen.bezierCurveTo(874, 778, 842, 767, 831, 752);
        pen.bezierCurveTo(813, 719, 800, 671, 791, 643);
        pen.bezierCurveTo(780, 729, 785, 835, 807, 916);
        pen.bezierCurveTo(817, 955, 802, 978, 784, 976);
        pen.bezierCurveTo(779, 1110, 742, 1405, 779, 1530);
        pen.bezierCurveTo(791, 1592, 829, 1676, 850, 1711);
        pen.lineTo(883, 1741); pen.lineTo(916, 1739);
        pen.lineTo(970, 1867); pen.lineTo(305, 1867);
        pen.lineTo(360, 1734); pen.lineTo(394, 1732);
        pen.bezierCurveTo(436, 1540, 426, 1370, 449, 1247);
        pen.bezierCurveTo(407, 1256, 347, 1239, 350, 1185);
        pen.bezierCurveTo(351, 1150, 362, 1120, 384, 1110);
        pen.bezierCurveTo(360, 1081, 371, 1045, 387, 1027);
        pen.bezierCurveTo(380, 1014, 377, 990, 383, 962);
        pen.bezierCurveTo(391, 917, 404, 855, 415, 792);
        pen.bezierCurveTo(426, 710, 425, 559, 447, 513);
        pen.bezierCurveTo(462, 478, 503, 460, 535, 437);
        pen.bezierCurveTo(562, 423, 576, 421, 571, 391);
        pen.bezierCurveTo(548, 351, 543, 290, 544, 238);
        pen.closePath(); pen.fill();
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(mask, 0, 0);
        context.globalCompositeOperation = 'source-over';
      }

      const pixels = context.getImageData(0, 0, width, height);
      const bytes = pixels.data;
      if (job.mask === 'dark' || job.mask === 'red') {
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let tail = 0;
        const enqueue = (index) => {
          if (visited[index]) return;
          visited[index] = 1;
          const offset = index * 4;
          const r = bytes[offset], g = bytes[offset + 1], b = bytes[offset + 2];
          const background = job.mask === 'dark'
            ? Math.max(r, g, b) < 38
            : r - g > 12 + g * 0.08 && r - b > 16;
          if (background) { bytes[offset + 3] = 0; queue[tail++] = index; }
        };
        for (let column = 0; column < width; column++) { enqueue(column); enqueue((height - 1) * width + column); }
        for (let row = 0; row < height; row++) { enqueue(row * width); enqueue(row * width + width - 1); }
        for (let head = 0; head < tail; head++) {
          const index = queue[head], column = index % width;
          if (column > 0) enqueue(index - 1);
          if (column < width - 1) enqueue(index + 1);
          if (index >= width) enqueue(index - width);
          if (index < width * (height - 1)) enqueue(index + width);
        }
      }
      const alpha = new Uint8Array(width * height);
      const luminance = new Float32Array(width * height);
      for (let index = 0; index < width * height; index++) {
        const offset = index * 4;
        alpha[index] = bytes[offset + 3];
        const value = (bytes[offset] * 0.2126 + bytes[offset + 1] * 0.7152 + bytes[offset + 2] * 0.0722) / 255;
        luminance[index] = Math.max(0, Math.min(1, (value - 0.16) * (job.study ? 1.15 : 1.2)));
      }
      const matrix = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const neutral = [[18, 18, 18], [85, 84, 75], [165, 163, 149], [222, 220, 200]];
      const red = [[18, 18, 18], [111, 28, 17], [194, 41, 19], [255, 50, 21]];
      const encode = (palette) => {
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const index = row * width + column, offset = index * 4;
          const threshold = (matrix[(row % 4) * 4 + column % 4] + 0.5) / 16 - 0.5;
          const level = Math.max(0, Math.min(3, Math.round(luminance[index] * 3 + threshold * 0.72)));
          const color = palette[level];
          bytes[offset] = color[0]; bytes[offset + 1] = color[1]; bytes[offset + 2] = color[2]; bytes[offset + 3] = alpha[index];
        }
        context.putImageData(pixels, 0, 0);
        return canvas.toDataURL('image/webp', 0.94).split(',')[1];
      };
      return { neutral: encode(neutral), red: encode(red), width, height };
    }, { job, imageUrl: 'data:' + mime + ';base64,' + data.toString('base64') });
    await writeFile(path.join(assetDirectory, job.output + '.webp'), Buffer.from(result.neutral, 'base64'));
    if (!job.study) await writeFile(path.join(assetDirectory, job.output + '-red.webp'), Buffer.from(result.red, 'base64'));
    console.log(job.output + ': ' + result.width + ' x ' + result.height);
  }
} finally {
  await browser.close();
}
