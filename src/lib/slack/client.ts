import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Posts a message to a Slack channel.
 *
 * If threadTs is provided, the message is posted as a reply to that thread
 * (Section 3.7). The summary string uses Slack mrkdwn — *bold* section labels
 * and • bullets are passed through without conversion.
 */
export async function postToSlack(
  channelId: string,
  text: string,
  threadTs?: string | null
): Promise<void> {
  await slack.chat.postMessage({
    channel: channelId,
    text,
    mrkdwn: true,
    ...(threadTs ? { thread_ts: threadTs } : {}),
  });
}
