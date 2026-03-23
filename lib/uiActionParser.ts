export interface UIAction {
  type: 'highlight' | 'navigate' | 'focus';
  target: string;
  delay?: number;
}

export function parseUIAction(text: string): UIAction | null {
  const lower = text.toLowerCase();

  // Navigation hints
  if (lower.includes('follow-up') || lower.includes('pipeline') || lower.includes('triage')) {
    return { type: 'highlight', target: 'nav-followup', delay: 800 };
  }
  
  if (lower.includes('m&e') || lower.includes('duplicate') || lower.includes('data integrity') || lower.includes('quality')) {
    return { type: 'highlight', target: 'nav-mande', delay: 800 };
  }
  
  if (lower.includes('gis') || lower.includes('map') || lower.includes('district') || lower.includes('spatial')) {
    return { type: 'highlight', target: 'nav-gis', delay: 800 };
  }
  
  if (lower.includes('vertex') || lower.includes('overview') || lower.includes('neural') || lower.includes('dashboard')) {
    return { type: 'highlight', target: 'nav-vertex', delay: 800 };
  }
  
  if (lower.includes('settings') || lower.includes('account') || lower.includes('sync')) {
    return { type: 'highlight', target: 'nav-settings', delay: 800 };
  }

  return null;
}

export function parseUIActionsFromAnalysis(analysis: any): UIAction | null {
  // Check recommendations for navigation hints
  if (analysis.recommendations) {
    const recsText = analysis.recommendations.join(' ').toLowerCase();
    
    if (recsText.includes('follow-up') || recsText.includes('pipeline')) {
      return { type: 'highlight', target: 'nav-followup', delay: 1200 };
    }
    
    if (recsText.includes('m&e') || recsText.includes('duplicate')) {
      return { type: 'highlight', target: 'nav-mande', delay: 1200 };
    }
    
    if (recsText.includes('map') || recsText.includes('gis')) {
      return { type: 'highlight', target: 'nav-gis', delay: 1200 };
    }
  }

  // Check spoken response
  if (analysis.spokenResponse) {
    return parseUIAction(analysis.spokenResponse);
  }

  return null;
}

export function getTargetSelector(sonicId: string): string {
  return `[data-sonic="${sonicId}"]`;
}
