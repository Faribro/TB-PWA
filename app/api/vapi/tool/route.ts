import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (message?.toolCalls) {
      const toolCall = message.toolCalls[0];
      
      if (toolCall.function.name === 'queryDistrictData') {
        const { district, metric } = JSON.parse(toolCall.function.arguments);
        
        const response = await fetch(`${process.env.GOOGLE_APPSCRIPT_URL}?district=${district}`);
        const data = await response.json();
        
        let result = '';
        if (metric === 'screened') {
          result = `${district} has screened ${data.screened} patients.`;
        } else if (metric === 'breaches') {
          result = `${district} has ${data.breachCount} SLA breaches (${data.breachRate}% breach rate).`;
        } else if (metric === 'completion_rate') {
          result = `${district} has a ${((data.completed / data.initiated) * 100).toFixed(1)}% treatment completion rate.`;
        }
        
        return NextResponse.json({
          results: [{
            toolCallId: toolCall.id,
            result: result,
          }],
        });
      }
    }

    return NextResponse.json({ error: 'Invalid tool call' }, { status: 400 });
  } catch (error: any) {
    console.error('VAPI tool error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
