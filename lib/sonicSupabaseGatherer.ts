import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface SmartInsight {
  type: 'insight' | 'data' | 'alert';
  text: string;
  filters?: any;
  data?: any;
  presentationCue?: 'intro' | 'midpoint' | 'outro';
}

const fmt = (n: number): string => n.toLocaleString();

export async function gatherSmartInsights(command: string): Promise<SmartInsight | null> {
  const cmd = command.toLowerCase().trim();

  try {
    // ── 1. TOTAL COUNT ──────────────────────────────────────────────────
    if (cmd.match(/how many|total|count/i) && cmd.match(/patient|screened|all/i)) {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      return {
        type: 'data',
        text: `Sir, we have ${fmt(count || 0)} total patients in the system across all districts! 📊`,
        data: { total: count },
      };
    }

    // ── 2. DIAGNOSED ────────────────────────────────────────────────────
    if (cmd.match(/diagnos|tb positive|confirmed/i)) {
      const [{ count: diagnosed }, { count: total }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('tb_diagnosed', 'Y'),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
      ]);

      const rate = total ? (((diagnosed || 0) / total) * 100).toFixed(1) : '0';

      return {
        type: 'data',
        text: `Sir, ${fmt(diagnosed || 0)} patients have been diagnosed with TB — that's ${rate}% of all screened patients! 🎯`,
        data: { diagnosed, rate },
      };
    }

    // ── 3. TREATMENT / ATT ──────────────────────────────────────────────
    if (cmd.match(/treatment|att|initiated/i)) {
      const [{ count: initiated }, { count: diagnosed }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).not('att_start_date', 'is', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('tb_diagnosed', 'Y'),
      ]);

      const rate = diagnosed ? (((initiated || 0) / diagnosed) * 100).toFixed(1) : '0';
      const isCritical = parseFloat(rate) < 95;

      return {
        type: isCritical ? 'alert' : 'data',
        text: isCritical
          ? `⚠️ Sir, only ${fmt(initiated || 0)} patients on treatment (${rate}% initiation rate). We're below the 95% target!`
          : `Sir, ${fmt(initiated || 0)} patients have started ATT — ${rate}% initiation rate. Excellent! 💊`,
        data: { initiated, rate },
      };
    }

    // ── 4. SLA BREACHES ─────────────────────────────────────────────────
    if (cmd.match(/breach|delay|overdue|sla|violation/i)) {
      const { count: breaches } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('sla_status', 'Breach');

      const b = breaches || 0;

      return {
        type: 'alert',
        text:
          b > 1000
            ? `🚨 CRITICAL Sir! ${fmt(b)} patients have SLA breaches! Immediate action needed!`
            : b > 0
            ? `⚠️ Sir, ${fmt(b)} patients are overdue for follow-up. Let's prioritize them!`
            : `✅ Zero SLA breaches Sir! All patients are on track! 🎉`,
        filters: { status: 'High Alert' },
        data: { breaches: b, severity: b > 1000 ? 'critical' : b > 500 ? 'high' : 'medium' },
      };
    }

    // ── 5. WORST / BEST DISTRICT ────────────────────────────────────────
    if (cmd.match(/which district|top district|worst|best district|highest|lowest/i)) {
      // Pull per-district breach counts via a view or RPC if available;
      // fallback: aggregate with select on sla_status = 'Breach' grouped by district
      const { data: breachRows } = await supabase
        .from('patients')
        .select('screening_district')
        .eq('sla_status', 'Breach')
        .not('screening_district', 'is', null);

      const { data: totalRows } = await supabase
        .from('patients')
        .select('screening_district')
        .not('screening_district', 'is', null);

      if (!breachRows || !totalRows) {
        return { type: 'data', text: 'Sir, no district data available at the moment.', data: {} };
      }

      // O(n) aggregation on the lightweight district-only payload
      const totals = new Map<string, number>();
      const breaches = new Map<string, number>();

      for (const r of totalRows) totals.set(r.screening_district, (totals.get(r.screening_district) || 0) + 1);
      for (const r of breachRows) breaches.set(r.screening_district, (breaches.get(r.screening_district) || 0) + 1);

      let worstDist = '', worstRate = 0, worstCount = 0;
      let bestDist = '', bestRate = 1;

      totals.forEach((total, dist) => {
        const b = breaches.get(dist) || 0;
        const rate = b / total;
        if (rate > worstRate || (rate === worstRate && b > worstCount)) {
          worstRate = rate; worstDist = dist; worstCount = b;
        }
        if (total >= 10 && rate < bestRate) {
          bestRate = rate; bestDist = dist;
        }
      });

      if (cmd.match(/worst|highest breach|critical/i)) {
        return {
          type: 'alert',
          text: `🛑 Sir, ${worstDist} is the worst performing district with ${fmt(worstCount)} breaches (${(worstRate * 100).toFixed(1)}% breach rate)! Urgent attention needed!`,
          filters: { district: worstDist },
          data: { district: worstDist, breaches: worstCount, rate: worstRate },
        };
      }

      return {
        type: 'data',
        text: `🏆 Sir, ${bestDist} is performing excellently with only ${(bestRate * 100).toFixed(1)}% breach rate! They're our top district!`,
        filters: { district: bestDist },
        data: { district: bestDist, rate: bestRate },
      };
    }

    // ── 6. SPECIFIC DISTRICT ────────────────────────────────────────────
    const districtMatch = cmd.match(
      /\b(mumbai|pune|delhi|bangalore|chennai|kolkata|hyderabad|ahmedabad|surat|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|pimpri|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|kalyan|vasai|varanasi|srinagar|aurangabad|dhanbad|amritsar|navi mumbai|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|guwahati)\b/i
    );

    if (districtMatch) {
      const district = districtMatch[0];
      const label = district.replace(/\b\w/g, c => c.toUpperCase());

      const [
        { count: total }, { count: diagnosed }, { count: initiated },
        { count: breaches }, { count: completed }, { count: referred },
        { data: facilityRows }, { count: pendingATT }, { count: recentScreened },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).eq('tb_diagnosed', 'Y'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).not('att_start_date', 'is', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).eq('sla_status', 'Breach'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).not('att_completion_date', 'is', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).not('referral_date', 'is', null),
        supabase.from('patients').select('facility_name').ilike('screening_district', `%${district}%`).not('facility_name', 'is', null),
        // Diagnosed but ATT not started = pending initiation gap
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).eq('tb_diagnosed', 'Y').is('att_start_date', null),
        // Screened in last 30 days
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${district}%`).gte('screening_date', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      if (!total) return { type: 'data', text: `Sir, no data found for ${label}. The district might be spelled differently in our system.`, data: {} };

      const t = total || 0;
      const dx = diagnosed || 0;
      const ix = initiated || 0;
      const bx = breaches || 0;
      const cx = completed || 0;
      const rx = referred || 0;
      const px = pendingATT || 0;
      const recent = recentScreened || 0;

      const diagRate = t > 0 ? ((dx / t) * 100).toFixed(1) : '0';
      const attRate = dx > 0 ? ((ix / dx) * 100).toFixed(1) : '0';
      const completionRate = ix > 0 ? ((cx / ix) * 100).toFixed(1) : '0';
      const breachRate = t > 0 ? ((bx / t) * 100).toFixed(1) : '0';
      const referralRate = t > 0 ? ((rx / t) * 100).toFixed(1) : '0';

      // Top facility by count
      const facilityCount = new Map<string, number>();
      (facilityRows || []).forEach((r: any) => {
        if (r.facility_name) facilityCount.set(r.facility_name, (facilityCount.get(r.facility_name) || 0) + 1);
      });
      const topFacility = [...facilityCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const facilityCount2 = facilityCount.size;

      // Risk signal
      const riskLevel = bx > 100 ? '🔴 CRITICAL' : bx > 50 ? '🟠 HIGH' : bx > 10 ? '🟡 MODERATE' : '🟢 LOW';
      const attGapWarning = px > 20 ? `⚠️ ${fmt(px)} diagnosed patients haven\'t started ATT yet — initiation gap!` : px > 0 ? `${fmt(px)} patients pending ATT start.` : '✅ All diagnosed patients initiated on ATT.';
      const yieldSignal = parseFloat(diagRate) > 15 ? '🎯 Excellent yield!' : parseFloat(diagRate) > 8 ? '📈 Good yield.' : parseFloat(diagRate) < 3 ? '⚠️ Very low yield — screening quality check needed.' : '📊 Average yield.';
      const activitySignal = recent > 50 ? `🔥 ${fmt(recent)} screened in last 30 days — high activity!` : recent > 10 ? `📅 ${fmt(recent)} screened recently.` : `⚠️ Only ${fmt(recent)} screened in last 30 days — low activity!`;

      const text =
        `Alright Sir, here's the full picture on ${label}. ` +
        `Out of ${fmt(t)} patients screened, ${fmt(rx)} were referred for sputum testing — that's a referral rate of ${referralRate}%. ` +
        (dx > 0
          ? `We confirmed TB in ${fmt(dx)} of them, giving us a yield of ${diagRate}%. ${yieldSignal} `
          : `Interestingly, we have zero TB diagnoses so far — that's either great news or a data entry issue worth checking. `) +
        (ix > 0
          ? `${fmt(ix)} patients have started ATT, which is ${attRate}% of all diagnosed. `
          : `No one has started ATT yet Sir. `) +
        (cx > 0 ? `${fmt(cx)} have already completed treatment — ${completionRate}% completion rate. ` : '') +
        `\n\nOn the SLA front, ` +
        (bx > 0
          ? `we have ${fmt(bx)} breaches — that's ${breachRate}% of all screened patients. Risk level is ${riskLevel}. `
          : `we're clean Sir! Zero SLA breaches. `) +
        `${attGapWarning} ` +
        `\n\nActivity-wise, ${activitySignal} ` +
        `This district has ${facilityCount2} active ${facilityCount2 === 1 ? 'facility' : 'facilities'}, with ${topFacility} leading the numbers. ` +
        `\n\n${bx > 50
          ? `Sir, ${label} needs urgent attention right now. ${fmt(bx)} breaches is way too high!`
          : dx === 0
          ? `My recommendation — let's verify the data pipeline for ${label}. Zero diagnoses with ${fmt(t)} screened is unusual.`
          : parseFloat(attRate) < 80
          ? `The weak point here is ATT initiation Sir. Only ${attRate}% of diagnosed patients have started treatment — we need to close that gap fast.`
          : `Overall ${label} is doing well Sir. Keep the momentum going!`
        }`;

      return {
        type: bx > 50 ? 'alert' : 'data',
        text,
        filters: { district: label },
        data: { 
          district: label, 
          total: t, 
          diagnosed: dx, 
          initiated: ix, 
          breaches: bx, 
          completed: cx, 
          referred: rx, 
          pendingATT: px, 
          recentScreened: recent,
          rates: {
            diagnosis: diagRate,
            initiation: attRate,
            completion: completionRate,
            breach: breachRate,
            referral: referralRate
          },
          facilities: {
            count: facilityCount2,
            top: topFacility
          }
        },
        presentationCue: bx > 50 ? 'midpoint' : bx === 0 ? 'outro' : 'intro',
      };
    }

    // ── 7. STATE ────────────────────────────────────────────────────────
    const stateMatch = cmd.match(
      /\b(maharashtra|gujarat|karnataka|tamil nadu|tamilnadu|uttar pradesh|west bengal|rajasthan|madhya pradesh|bihar|andhra pradesh|delhi|kerala|odisha|telangana|punjab|haryana|chhattisgarh|jharkhand|assam)\b/i
    );

    if (stateMatch) {
      const state = stateMatch[0];
      const label = state.replace(/\b\w/g, c => c.toUpperCase());

      const [
        { count: total }, { count: diagnosed }, { count: initiated },
        { count: breaches }, { count: completed }, { count: pendingATT },
        { count: recentScreened }, { data: districtRows },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).eq('tb_diagnosed', 'Y'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).not('att_start_date', 'is', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).eq('sla_status', 'Breach'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).not('att_completion_date', 'is', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).eq('tb_diagnosed', 'Y').is('att_start_date', null),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_state', `%${state}%`).gte('screening_date', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('patients').select('screening_district').ilike('screening_state', `%${state}%`).not('screening_district', 'is', null),
      ]);

      if (!total) return { type: 'data', text: `Sir, no data found for ${label}.`, data: {} };

      const t = total || 0;
      const dx = diagnosed || 0;
      const ix = initiated || 0;
      const bx = breaches || 0;
      const cx = completed || 0;
      const px = pendingATT || 0;
      const recent = recentScreened || 0;

      const diagRate = t > 0 ? ((dx / t) * 100).toFixed(1) : '0';
      const attRate = dx > 0 ? ((ix / dx) * 100).toFixed(1) : '0';
      const completionRate = ix > 0 ? ((cx / ix) * 100).toFixed(1) : '0';
      const breachRate = t > 0 ? ((bx / t) * 100).toFixed(1) : '0';

      const uniqueDistricts = new Set((districtRows || []).map((r: any) => r.screening_district)).size;
      const riskLevel = bx > 500 ? '🔴 CRITICAL' : bx > 200 ? '🟠 HIGH' : bx > 50 ? '🟡 MODERATE' : '🟢 LOW';
      const attGap = px > 0 ? `⚠️ ${fmt(px)} diagnosed patients pending ATT initiation!` : '✅ All diagnosed patients on ATT.';
      const activitySignal = recent > 200 ? `🔥 ${fmt(recent)} screened in last 30 days — strong momentum!` : `📅 ${fmt(recent)} screened in last 30 days.`;

      const text =
        `Sir, here's the state-level intelligence on ${label}. ` +
        `Across ${uniqueDistricts} districts, we've screened ${fmt(t)} patients in total. ` +
        (dx > 0
          ? `TB was confirmed in ${fmt(dx)} of them — a yield of ${diagRate}%. `
          : `No TB diagnoses recorded yet. `) +
        (ix > 0
          ? `${fmt(ix)} patients have started ATT, which is ${attRate}% of all diagnosed. `
          : dx > 0 ? `However, no ATT initiations recorded yet Sir. ` : '') +
        (cx > 0 ? `${fmt(cx)} have completed treatment — ${completionRate}% completion rate. ` : '') +
        (bx > 0
          ? `On the SLA side, there are ${fmt(bx)} breaches right now — ${breachRate}% of all screened. Risk level: ${riskLevel}. `
          : `On the SLA side, we have zero breaches Sir — excellent compliance! `) +
        `${attGap} ` +
        `${activitySignal} ` +
        (bx > 200
          ? `Sir, this is serious. ${label} has ${fmt(bx)} patients overdue for follow-up. We need to mobilize the field teams immediately.`
          : dx > 0 && parseFloat(attRate) < 80
          ? `The main gap in ${label} is ATT initiation — only ${attRate}% of diagnosed patients have started treatment. That needs to be addressed urgently Sir.`
          : dx === 0 && t > 0
          ? `Sir, ${label} has screened ${fmt(t)} patients but zero TB diagnoses. This could indicate excellent health outcomes or a data pipeline issue worth verifying.`
          : `Overall ${label} is on track Sir. Keep pushing!`
        );

      return {
        type: bx > 200 ? 'alert' : 'data',
        text,
        filters: { state: label },
        data: { state: label, total: t, diagnosed: dx, initiated: ix, breaches: bx, completed: cx, pendingATT: px, districts: uniqueDistricts },
        presentationCue: bx > 200 ? 'midpoint' : 'intro',
      };
    }

    // ── 8. TIME-BASED ───────────────────────────────────────────────────
    if (cmd.match(/today|this week|this month|recent/i)) {
      const now = new Date();
      let startDate: Date;
      let period: string;

      if (cmd.includes('today')) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        period = 'Today';
      } else if (cmd.includes('week')) {
        startDate = new Date(now.getTime() - 7 * 86400000);
        period = 'This week';
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        period = 'This month';
      }

      const [{ count }, { count: diagnosed }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).gte('screening_date', startDate.toISOString()),
        supabase.from('patients').select('*', { count: 'exact', head: true }).gte('screening_date', startDate.toISOString()).eq('tb_diagnosed', 'Y'),
      ]);

      return {
        type: 'data',
        text: `📅 ${period}: ${fmt(count || 0)} patients screened, ${fmt(diagnosed || 0)} diagnosed. ${(count || 0) > 100 ? 'Strong activity Sir! 💪' : 'Activity is moderate.'}`,
        data: { period, count, diagnosed },
      };
    }

    // ── 9. COMPARE TWO DISTRICTS ────────────────────────────────────────
    const compareMatch = cmd.match(/compare\s+(\w+)\s+(?:and|vs|versus)\s+(\w+)/i);
    if (compareMatch) {
      const [, distA, distB] = compareMatch;

      const [
        { count: totalA }, { count: breachesA },
        { count: totalB }, { count: breachesB },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${distA}%`),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${distA}%`).eq('sla_status', 'Breach'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${distB}%`),
        supabase.from('patients').select('*', { count: 'exact', head: true }).ilike('screening_district', `%${distB}%`).eq('sla_status', 'Breach'),
      ]);

      const rateA = totalA ? (((breachesA || 0) / totalA) * 100).toFixed(1) : '0';
      const rateB = totalB ? (((breachesB || 0) / totalB) * 100).toFixed(1) : '0';
      const better = parseFloat(rateA) <= parseFloat(rateB) ? distA : distB;

      return {
        type: 'data',
        text: `⚖️ Comparison: ${distA} has ${fmt(totalA || 0)} patients (${rateA}% breach) vs ${distB} with ${fmt(totalB || 0)} patients (${rateB}% breach). ${better} is performing better!`,
        data: { distA, distB, totalA, totalB, rateA, rateB },
      };
    }
  } catch (err) {
    console.error('❌ Sonic Intelligence Error:', err);
    return null;
  }

  return null;
}
