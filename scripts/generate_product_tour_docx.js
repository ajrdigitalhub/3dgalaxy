const fs = require('fs');
const path = require('path');
const docx = require('./docx_tool/node_modules/docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  ImageRun
} = docx;

const MD_PATH = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.md');
const DOCS_DOCX = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.docx');
const ROOT_DOCX = path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.docx');
const DOCS_DOC = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.doc');
const ROOT_DOC = path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.doc');

const AJR_LOGO_PATH = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', 'ajr_digital_hub_logo.png');
const GALAXY_LOGO_PATH = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', '3d_galaxy_logo.png');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');

// Colors
const COLOR_NAVY = '0B1120';
const COLOR_DARK = '0F172A';
const COLOR_BLUE = '0284C7';
const COLOR_ORANGE = 'EA580C';
const COLOR_TEXT = '334155';
const COLOR_BG_LIGHT = 'F8FAFC';
const COLOR_BORDER = 'CBD5E1';

function createHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: 'AJR DIGITAL HUB | 3D GALAXY  ',
            font: 'Segoe UI',
            size: 16,
            bold: true,
            color: COLOR_ORANGE
          }),
          new TextRun({
            text: 'PRODUCT CONFIGURATION VISUAL TOUR GUIDE',
            font: 'Segoe UI',
            size: 16,
            bold: true,
            color: COLOR_BLUE
          })
        ]
      })
    ]
  });
}

function createFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: 'DOC-3DG-PRD-TOUR-2026-V1.0 • 3D Galaxy Product Configuration Tour • AJR Digital Hub',
            font: 'Segoe UI',
            size: 15,
            color: '64748B'
          }),
          new TextRun({
            text: '\t\tPage ',
            font: 'Segoe UI',
            size: 15,
            color: '64748B'
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: 'Segoe UI',
            size: 15,
            bold: true,
            color: COLOR_BLUE
          }),
          new TextRun({
            text: ' of ',
            font: 'Segoe UI',
            size: 15,
            color: '64748B'
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: 'Segoe UI',
            size: 15,
            bold: true,
            color: COLOR_BLUE
          })
        ]
      })
    ]
  });
}

function parseMarkdownTable(tableLines) {
  if (tableLines.length < 2) return null;

  const parseRow = (line) => {
    return line
      .split('|')
      .slice(1, -1)
      .map(c => c.trim());
  };

  const headerCells = parseRow(tableLines[0]);
  const isDivider = (line) => line.includes('---');

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headerCells.map(text => new TableCell({
        shading: { fill: COLOR_NAVY, type: ShadingType.CLEAR },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ORANGE },
          left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY },
          right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY }
        },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: text.replace(/\*\*/g, ''),
                bold: true,
                color: 'FFFFFF',
                font: 'Segoe UI',
                size: 16
              })
            ]
          })
        ]
      }))
    })
  ];

  for (let i = 1; i < tableLines.length; i++) {
    if (isDivider(tableLines[i])) continue;
    const cells = parseRow(tableLines[i]);
    const isEven = (tableRows.length % 2 === 0);
    tableRows.push(
      new TableRow({
        children: cells.map(text => new TableCell({
          shading: isEven ? { fill: COLOR_BG_LIGHT, type: ShadingType.CLEAR } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
            left: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
            right: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER }
          },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: text.replace(/\*\*/g, '').replace(/`/g, ''),
                  bold: text.includes('**'),
                  font: 'Segoe UI',
                  size: 16,
                  color: COLOR_TEXT
                })
              ]
            })
          ]
        }))
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

function processMarkdownToDocx(content) {
  const lines = content.split(/\r?\n/);
  const elements = [];

  // Cover Page Dual Logos
  const logoCells = [];
  if (fs.existsSync(AJR_LOGO_PATH)) {
    const ajrBuffer = fs.readFileSync(AJR_LOGO_PATH);
    logoCells.push(
      new TableCell({
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'DELIVERED BY\n', bold: true, size: 14, color: COLOR_ORANGE, font: 'Segoe UI' }),
              new ImageRun({
                data: ajrBuffer,
                transformation: { width: 170, height: 113 }
              })
            ]
          })
        ]
      })
    );
  }

  if (fs.existsSync(GALAXY_LOGO_PATH)) {
    const galaxyBuffer = fs.readFileSync(GALAXY_LOGO_PATH);
    logoCells.push(
      new TableCell({
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ACCEPTED BY / CLIENT\n', bold: true, size: 14, color: COLOR_BLUE, font: 'Segoe UI' }),
              new ImageRun({
                data: galaxyBuffer,
                transformation: { width: 113, height: 113 }
              })
            ]
          })
        ]
      })
    );
  }

  if (logoCells.length > 0) {
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: logoCells
          })
        ]
      })
    );
  }

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: '3D GALAXY E-COMMERCE & CUSTOM MANUFACTURING',
          font: 'Segoe UI',
          size: 24,
          bold: true,
          color: COLOR_BLUE
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 100 },
      children: [
        new TextRun({
          text: 'VISUAL PRODUCT CONFIGURATION',
          font: 'Segoe UI',
          size: 44,
          bold: true,
          color: COLOR_NAVY
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 200 },
      children: [
        new TextRun({
          text: 'MASTER TOUR GUIDE & STEP-BY-STEP FIELD REFERENCE',
          font: 'Segoe UI',
          size: 24,
          bold: true,
          color: COLOR_ORANGE
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 400 },
      children: [
        new TextRun({
          text: 'Visual Training Manual with Numbered Screen Highlights, Opened Dropdown Tours, and Pre-Publish Checklists',
          font: 'Segoe UI',
          size: 20,
          italics: true,
          color: '64748B'
        })
      ]
    })
  );

  // Cover Page Metadata Table
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BLUE },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BLUE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'DELIVERED BY:\n', bold: true, size: 18, color: COLOR_ORANGE, font: 'Segoe UI' }),
                    new TextRun({ text: 'AJR Digital Hub Team\n', bold: true, size: 20, color: COLOR_NAVY, font: 'Segoe UI' }),
                    new TextRun({ text: 'Enterprise Digital Solutions Team\nAJR Digital Hub', size: 16, color: '64748B', font: 'Segoe UI' })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BLUE },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BLUE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ACCEPTED BY:\n', bold: true, size: 18, color: COLOR_BLUE, font: 'Segoe UI' }),
                    new TextRun({ text: '3D Galaxy Team\n', bold: true, size: 20, color: COLOR_NAVY, font: 'Segoe UI' }),
                    new TextRun({ text: 'Catalog Administration & Store Operations\n3D Galaxy India', size: 16, color: '64748B', font: 'Segoe UI' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 600 },
      children: [
        new TextRun({
          text: 'Document Identifier: DOC-3DG-PRD-TOUR-2026-V1.0  |  Release: Version 1.0 (Production Master)  |  Published: September 2026',
          font: 'Segoe UI',
          size: 15,
          color: '94A3B8'
        })
      ],
      pageBreakBefore: true
    })
  );

  let inTable = false;
  let tableBuffer = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i < 30 && (line.startsWith('# 3D GALAXY') || line.startsWith('## PRODUCT') || line.startsWith('### Visual') || line.includes('DELIVERED BY') || line.includes('<p align') || line.includes('<img src=') || line.includes('</p>'))) {
      continue;
    }
    if (line.includes('![AJR Digital Hub Logo]') || line.includes('assets/product-configuration-tour/3d_galaxy_logo.png') || line.includes('assets/product-configuration-tour/ajr_digital_hub_logo.png')) {
      continue;
    }

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          new Paragraph({
            spacing: { before: 100, after: 100 },
            shading: { fill: COLOR_NAVY, type: ShadingType.CLEAR },
            border: {
              left: { style: BorderStyle.SINGLE, size: 16, color: COLOR_ORANGE }
            },
            children: [
              new TextRun({
                text: codeBuffer.join('\n'),
                font: 'JetBrains Mono',
                size: 14,
                color: '38BDF8'
              })
            ]
          })
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim().startsWith('|')) {
      inTable = true;
      tableBuffer.push(line.trim());
      continue;
    } else if (inTable) {
      const parsedTable = parseMarkdownTable(tableBuffer);
      if (parsedTable) elements.push(parsedTable);
      tableBuffer = [];
      inTable = false;
    }

    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const altText = imgMatch[1];
      let relPath = imgMatch[2];
      const imgFileName = path.basename(relPath);
      const fullImgPath = path.resolve(SCREENSHOTS_DIR, imgFileName);

      if (fs.existsSync(fullImgPath)) {
        try {
          const imgData = fs.readFileSync(fullImgPath);
          elements.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 150, after: 60 },
              children: [
                new ImageRun({
                  data: imgData,
                  transformation: { width: 520, height: 260 }
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 150 },
              children: [
                new TextRun({
                  text: altText || imgFileName,
                  font: 'Segoe UI',
                  size: 15,
                  italics: true,
                  color: '64748B'
                })
              ]
            })
          );
        } catch (e) {
          console.warn('Could not embed image:', fullImgPath, e.message);
        }
      }
      continue;
    }

    if (line.startsWith('## STEP ') || line.startsWith('## 1.') || line.startsWith('## 2.') || line.startsWith('## 29.') || line.startsWith('## 30.')) {
      elements.push(
        new Paragraph({
          text: line.replace(/##\s*/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 100 },
          pageBreakBefore: true
        })
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        new Paragraph({
          text: line.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 }
        })
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        new Paragraph({
          text: line.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 140, after: 60 }
        })
      );
    } else if (line.startsWith('> [!')) {
      const alertType = line.includes('WARNING') || line.includes('CAUTION') ? 'WARNING' : (line.includes('TIP') ? 'TIP' : 'NOTE');
      const alertColor = alertType === 'WARNING' ? COLOR_ORANGE : (alertType === 'TIP' ? '16A34A' : COLOR_BLUE);
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 16, color: alertColor }
          },
          shading: { fill: COLOR_BG_LIGHT, type: ShadingType.CLEAR },
          children: [
            new TextRun({
              text: `  [${alertType}] `,
              bold: true,
              color: alertColor,
              font: 'Segoe UI',
              size: 17
            })
          ]
        })
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        new Paragraph({
          spacing: { before: 0, after: 100 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 16, color: COLOR_BLUE }
          },
          shading: { fill: COLOR_BG_LIGHT, type: ShadingType.CLEAR },
          children: [
            new TextRun({
              text: '  ' + line.replace('> ', '').replace(/\*\*/g, ''),
              font: 'Segoe UI',
              size: 16,
              color: COLOR_TEXT
            })
          ]
        })
      );
    } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: line.replace(/^[\s*-]+/, '').replace(/\*\*/g, ''),
              font: 'Segoe UI',
              size: 16,
              color: COLOR_TEXT
            })
          ]
        })
      );
    } else if (line.trim().length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 60, after: 80 },
          children: [
            new TextRun({
              text: line.replace(/\*\*/g, '').replace(/<[^>]+>/g, ''),
              font: 'Segoe UI',
              size: 17,
              color: COLOR_TEXT
            })
          ]
        })
      );
    }
  }

  return elements;
}

async function run() {
  console.log('Reading Markdown content from:', MD_PATH);
  const mdContent = fs.readFileSync(MD_PATH, 'utf8');

  console.log('Processing document sections...');
  const docElements = processMarkdownToDocx(mdContent);

  console.log('Building Document package with styling...');
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Segoe UI',
            color: COLOR_TEXT,
            size: 17
          }
        },
        heading1: {
          run: {
            font: 'Segoe UI',
            size: 32,
            bold: true,
            color: COLOR_NAVY
          }
        },
        heading2: {
          run: {
            font: 'Segoe UI',
            size: 26,
            bold: true,
            color: COLOR_BLUE
          }
        },
        heading3: {
          run: {
            font: 'Segoe UI',
            size: 22,
            bold: true,
            color: COLOR_NAVY
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000
            }
          }
        },
        headers: { default: createHeader() },
        footers: { default: createFooter() },
        children: docElements
      }
    ]
  });

  console.log('Packing Word document buffer...');
  const buffer = await Packer.toBuffer(doc);

  console.log('Writing to output destinations:');
  fs.writeFileSync(DOCS_DOCX, buffer);
  fs.writeFileSync(ROOT_DOCX, buffer);
  fs.writeFileSync(DOCS_DOC, buffer);
  fs.writeFileSync(ROOT_DOC, buffer);

  const stats = fs.statSync(DOCS_DOCX);
  console.log('SUCCESS! Word (.docx / .doc) documents generated:');
  console.log('  1. ' + DOCS_DOCX);
  console.log('  2. ' + ROOT_DOCX);
  console.log('  3. ' + DOCS_DOC);
  console.log('  4. ' + ROOT_DOC);
  console.log('DOCX File Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
}

run().catch(err => {
  console.error('Failed to generate DOCX:', err);
  process.exit(1);
});
