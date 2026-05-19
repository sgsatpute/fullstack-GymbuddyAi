import config from "../config.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

function getTextFromContentBlocks(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) =>
      block?.type === "text" && typeof block.text === "string" ? block.text : ""
    )
    .join("\n")
    .trim();
}

async function requestAnthropicMessage({
  system,
  messages,
  maxTokens,
  fallbackText,
}) {
  if (!config.anthropicApiKey) {
    return fallbackText;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      return fallbackText;
    }

    const data = await response.json();
    const text = getTextFromContentBlocks(data?.content);

    return text || fallbackText;
  } catch {
    return fallbackText;
  }
}

export function hasAnthropicApiKey() {
  return Boolean(config.anthropicApiKey);
}

export async function requestAnthropicText({
  system,
  messages,
  maxTokens,
  fallbackText,
}) {
  return requestAnthropicMessage({
    system,
    messages,
    maxTokens,
    fallbackText,
  });
}

export async function requestAnthropicVisionText({
  system,
  prompt,
  mediaType,
  imageBase64,
  maxTokens,
  fallbackText,
}) {
  return requestAnthropicMessage({
    system,
    maxTokens,
    fallbackText,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });
}
