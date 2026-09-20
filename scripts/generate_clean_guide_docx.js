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

const MD_PATH = path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Guide.md');

const TARGET_OUTPUTS = [
  { docx: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Guide.docx'), doc: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Guide.doc') },
  { docx: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Guide.docx'), doc: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Guide.doc') },
  { docx: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Master_Guide.docx'), doc: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Master_Guide.doc') },
  { docx: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Master_Guide.docx'), doc: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Master_Guide.doc') },
  { docx: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.docx'), doc: path.resolve(__dirname, '..', 'docs', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.doc') },
  { docx: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.docx'), doc: path.resolve(__dirname, '..', '3D_Galaxy_Product_Configuration_Visual_Tour_Guide.doc') }
];

const AJR_LOGO_PATH = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', 'ajr_digital_hub_logo.png');
const GALAXY_LOGO_PATH = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour', '3d_galaxy_logo.png');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'docs', 'assets', 'product-configuration-tour');

// Color Palette
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
            text: 'PRODUCT CONFIGURATION ADMINISTRATION GUIDE',
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
            text: 'DOC-3DG-PRD-ADMIN-2026-V2.0 • 3D Galaxy Product Configuration Guide • AJR Digital Hub',
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
          text: 'PRODUCT CONFIGURATION ADMINISTRATION GUIDE',
          font: 'Segoe UI',
          size: 40,
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
          text: 'COMPLETE OPERATIONAL REFERENCE, ARCHITECTURE & FIELD SPECIFICATION MANUAL',
          font: 'Segoe UI',
          size: 22,
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
          text: 'Professional Client-Facing Manual featuring Clean Native Application Screenshots, Exhaustive Field References, Category Architecture, Combination Matrix, and Pre-Publish Validation Gates',
          font: 'Segoe UI',
          size: 19,
          italics: true,
          color: '64748B'
        })
      ]
    })
  );

  // Cover Page Metadata Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY }, bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Delivered By:', bold: true, size: 16, font: 'Segoe UI' }), new TextRun({ text: ' AJR Digital Hub Team', size: 16, font: 'Segoe UI', color: COLOR_TEXT })] })]
          }),
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY }, bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Delivered To:', bold: true, size: 16, font: 'Segoe UI' }), new TextRun({ text: ' 3D Galaxy Team', size: 16, font: 'Segoe UI', color: COLOR_TEXT })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Document ID:', bold: true, size: 16, font: 'Segoe UI' }), new TextRun({ text: ' DOC-3DG-PRD-ADMIN-2026-V2.0', size: 16, font: 'Segoe UI', color: COLOR_TEXT })] })]
          }),
          new TableCell({
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_NAVY }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Release:', bold: true, size: 16, font: 'Segoe UI' }), new TextRun({ text: ' Version 2.0 (Clean Master) • September 2026', size: 16, font: 'Segoe UI', color: COLOR_TEXT })] })]
          })
        ]
      })
    ]
  });
  elements.push(metaTable);

  elements.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true
    })
  );

  let inCodeBlock = false;
  let codeLines = [];
  let inTableBlock = false;
  let tableLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i < 30 && (line.startsWith('# 3D GALAXY') || line.startsWith('## PRODUCT') || line.startsWith('### Professional') || line.includes('<p align') || line.includes('<img src=') || line.includes('</p>'))) {
      continue;
    }

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: COLOR_NAVY, type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 2, color: '1E293B' },
                      bottom: { style: BorderStyle.SINGLE, size: 2, color: '1E293B' },
                      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BLUE },
                      right: { style: BorderStyle.SINGLE, size: 2, color: '1E293B' }
                    },
                    margins: { top: 120, bottom: 120, left: 160, right: 160 },
                    children: codeLines.map(cl => new Paragraph({
                      spacing: { before: 20, after: 20 },
                      children: [
                        new TextRun({
                          text: cl,
                          font: 'Consolas',
                          size: 14,
                          color: '38BDF8'
                        })
                      ]
                    }))
                  })
                ]
              })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 60, after: 60 } })
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim().startsWith('|')) {
      if (!inTableBlock) {
        inTableBlock = true;
        tableLines = [line];
      } else {
        tableLines.push(line);
      }
      continue;
    } else {
      if (inTableBlock) {
        const tableObj = parseMarkdownTable(tableLines);
        if (tableObj) {
          elements.push(tableObj);
          elements.push(new Paragraph({ text: '', spacing: { before: 60, after: 60 } }));
        }
        inTableBlock = false;
        tableLines = [];
      }
    }

    // Clean Screenshots
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const altText = imgMatch[1];
      const imgPath = imgMatch[2];
      const imgFileName = path.basename(imgPath);
      const fullImgPath = path.join(SCREENSHOTS_DIR, imgFileName);

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

    // Headings
    if (line.startsWith('## 1.') || line.startsWith('## 2.') || line.startsWith('## 3.') || line.startsWith('## 4.') ||
        line.startsWith('## 5.') || line.startsWith('## 6.') || line.startsWith('## 7.') || line.startsWith('## 8.') ||
        line.startsWith('## 9.') || line.startsWith('## 10.') || line.startsWith('## 11.') || line.startsWith('## 12.') ||
        line.startsWith('## 13.') || line.startsWith('## 14.') || line.startsWith('## 15.') || line.startsWith('## 16.') ||
        line.startsWith('## 17.') || line.startsWith('## 18.') || line.startsWith('## 19.') || line.startsWith('## 20.') ||
        line.startsWith('## 21.') || line.startsWith('## 22.') || line.startsWith('## 23.')) {
      elements.push(
        new Paragraph({
          text: line.replace(/##\s*/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 100 },
          pageBreakBefore: true
        })
      );
    } else if (line.startsWith('### TAB ')) {
      elements.push(
        new Paragraph({
          text: line.replace(/###\s*/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
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
    } else if (line.startsWith('### FIGURE ')) {
      elements.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({
              text: line.replace('### ', ''),
              bold: true,
              font: 'Segoe UI',
              size: 20,
              color: COLOR_NAVY
            })
          ]
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
    } else if (line.startsWith('#### ')) {
      elements.push(
        new Paragraph({
          text: line.replace('#### ', ''),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 120, after: 40 }
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
              text: line.trim().replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, ''),
              font: 'Segoe UI',
              size: 17,
              color: COLOR_TEXT
            })
          ]
        })
      );
    } else if (line.trim() === '---') {
      elements.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER } },
          spacing: { before: 120, after: 120 }
        })
      );
    } else if (line.trim().length > 0) {
      elements.push(
        new Paragraph({
          spacing: { before: 40, after: 60 },
          children: [
            new TextRun({
              text: line.replace(/\*\*/g, '').replace(/`/g, ''),
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
  console.log('Reading Markdown at:', MD_PATH);
  const content = fs.readFileSync(MD_PATH, 'utf8');

  console.log('Building DOCX Document Model...');
  const docElements = processMarkdownToDocx(content);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Segoe UI',
            size: 17,
            color: COLOR_TEXT
          }
        }
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: COLOR_NAVY,
            font: 'Segoe UI'
          },
          paragraph: {
            spacing: { before: 240, after: 120 }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 24,
            bold: true,
            color: COLOR_BLUE,
            font: 'Segoe UI'
          },
          paragraph: {
            spacing: { before: 180, after: 80 }
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 20,
            bold: true,
            color: COLOR_DARK,
            font: 'Segoe UI'
          },
          paragraph: {
            spacing: { before: 140, after: 60 }
          }
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 18,
            bold: true,
            color: COLOR_TEXT,
            font: 'Segoe UI'
          },
          paragraph: {
            spacing: { before: 120, after: 40 }
          }
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        headers: { default: createHeader() },
        footers: { default: createFooter() },
        children: docElements
      }
    ]
  });

  console.log('Packing to buffer...');
  const buffer = await Packer.toBuffer(doc);

  for (const target of TARGET_OUTPUTS) {
    fs.writeFileSync(target.docx, buffer);
    fs.writeFileSync(target.doc, buffer);
    console.log('  ✓ ' + target.docx);
    console.log('  ✓ ' + target.doc);
  }

  const stats = fs.statSync(TARGET_OUTPUTS[0].docx);
  console.log('=====================================================');
  console.log('SUCCESS! Word Document (.docx & .doc) generated:');
  console.log('  File Size: ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
  console.log('=====================================================');
}

run().catch(err => {
  console.error('Docx Generation Failed:', err);
  process.exit(1);
});
