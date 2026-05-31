import { ok, fail, parseBody } from "@/lib/api";
import { runCustomerPipeline, runPipelineBatch, logAutomation } from "@/lib/pipeline";

/** POST /api/pipeline/run  对单个或全部客户重跑自动化流水线 */
export async function POST(req: Request) {
  const body = await parseBody<{
    customerId?: string;
    all?: boolean;
    forceEnrich?: boolean;
    forceDraft?: boolean;
  }>(req);

  try {
    if (body.all) {
      const results = await runPipelineBatch();
      await logAutomation(
        "pipeline",
        "success",
        `批量处理 ${results.length} 位客户`,
        JSON.stringify(results.slice(0, 20))
      );
      return ok({ results, count: results.length });
    }

    if (!body.customerId) {
      return fail("需要 customerId 或 all:true");
    }

    const result = await runCustomerPipeline(body.customerId, {}, {
      forceEnrich: body.forceEnrich,
      forceDraft: body.forceDraft,
    });
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pipeline failed";
    await logAutomation("pipeline", "error", msg);
    return fail(msg, 500);
  }
}
