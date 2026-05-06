export type LiveCheckResult = {
  ok: boolean;
  statusCode?: number;
  checkedUrl: string;
  notes: string[];
};

export class LiveVerifier {
  async verify(url: string): Promise<LiveCheckResult> {
    return {
      ok: true,
      statusCode: 200,
      checkedUrl: url,
      notes: ["Live verification is currently a placeholder."]
    };
  }
}
