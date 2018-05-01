// import { matchText } from './match-text';
import { NodeType } from "./node";

export interface BrowserContext {
  document: Document;
  window: Window;
}

export interface Context {
  document: Document;
  element?: HTMLElement;
  svg?: HTMLElement;
  window: Window;
}

export function domToSvg(node: Node, context: Context): HTMLElement {
  const { document, window } = context;

  if (!context.svg) {
    const element = node as HTMLElement;
    const svg = document.createElement("svg");

    const width = element.clientWidth;
    const height = element.clientHeight;

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const bg = document.createElement("rect");

    bg.setAttribute("width", String(width));
    bg.setAttribute("height", String(height));

    bg.setAttribute("x", String(0));
    bg.setAttribute("y", String(0));

    bg.setAttribute("fill", "rgb(255, 255, 255)");

    bg.setAttribute("id", "document-background");
    bg.setAttribute("data-background", "document");

    svg.appendChild(bg);
    context.svg = svg;
  }

  context.element = context.element || context.svg;

  switch (node.nodeType) {
    case NodeType.ELEMENT_NODE: {
      const inputElement = node as HTMLElement;
      const rect = inputElement.getBoundingClientRect();
      const styles = window.getComputedStyle(inputElement);

      if (styles.getPropertyValue("display") === "none") {
        break;
      }

      const group = document.createElement("g");
      const name = inputElement.tagName.toLowerCase();

      group.setAttribute("id", name);
      group.setAttribute("data-id", name);

      context.element.appendChild(group);
      context.element = group;

      if (rect.width > 0 && rect.height > 0) {
        const background = document.createElement("rect");

        background.setAttribute("width", String(rect.width));
        background.setAttribute("height", String(rect.height));

        background.setAttribute("x", String(inputElement.offsetLeft));
        background.setAttribute("y", String(inputElement.offsetTop));

        const backgroundColor = styles.backgroundColor || "rgba(0, 0, 0, 0)";

        background.setAttribute("fill", backgroundColor);

        background.setAttribute("id", `${name}-background`);
        background.setAttribute("data-background", name);

        group.appendChild(background);
      }

      walk(node, n => domToSvg(n, context));
      break;
    }
    case NodeType.TEXT_NODE: {
      const parent = node.parentElement;

      if (!parent) {
        break;
      }

      const styles = window.getComputedStyle(parent);
      const lineHeight = getLineHeight(styles, context);

      const container = document.createElement("text");
      container.setAttribute("x", String(parent.offsetLeft));
      container.setAttribute("y", String(parent.offsetTop));

      container.style.fontFamily = styles.getPropertyValue("font-family");
      container.style.fontSize = styles.getPropertyValue("font-size");
      container.style.fontWeight = styles.getPropertyValue("font-weight");

      getLines(node).forEach(line => {
        const span = document.createElement("tspan");
        span.textContent = line.text;
        span.setAttribute("x", String(line.rect.left));
        span.setAttribute("y", String(line.rect.top + lineHeight / 2));
        container.appendChild(span);
      });

      context.element.appendChild(container);
    }
  }

  return context.svg;
}

function walk(node: Node, predicate: (node: Node) => void): void {
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < node.childNodes.length; ++i) {
    predicate(node.childNodes[i]);
  }
}

function getLineHeight(styles: CSSStyleDeclaration, context: BrowserContext): number {
  const raw = styles.getPropertyValue("line-height");

  if (raw === "normal") {
    const fontSize = styles.getPropertyValue("font-size");
    return cssValueToNumber(fontSize) * 1.61;
  }

  return cssValueToNumber(raw);
}

interface Line {
  text: string;
  rect: ClientRect;
}

function getLines(node: Node): Line[] {
  let index = 0;

  const range: Range = document.createRange();
  range.selectNodeContents(node);

  const lines: Line[] = [];

  range.toString().split(" ").forEach(word => {
    const wordRange = document.createRange();
    wordRange.setStart(node, index);
    wordRange.setEnd(node, index + word.length);
    index += word.length;
    const rect = wordRange.getBoundingClientRect();

    const line = lines[lines.length - 1];

    if (!line || rect.top > line.rect.top) {
      lines.push({ text: word, rect });
    } else {
      line.text += ` ${word}`;
    }
  });

  return lines;
}

function cssValueToNumber(raw: string): number {
  return parseFloat(raw.replace(/px$/, ''));
}
