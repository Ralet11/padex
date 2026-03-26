export const RANK_CONFIG = {
  1: { id: 1, name: '1ra (Experto)', color: '#000000', starColor: '#FF4B4B', icon: 'star', min: 2400 },
  2: { id: 2, name: '2da', color: '#3AB7FF', starColor: '#3AB7FF', icon: 'star', min: 2000 },
  3: { id: 3, name: '3ra', color: '#10B981', starColor: '#10B981', icon: 'star', min: 1600 },
  4: { id: 4, name: '4ta', color: '#94A3B8', starColor: '#E2E8F0', icon: 'star', min: 1200 },
  5: { id: 5, name: '5ta', color: '#F59E0B', starColor: '#F59E0B', icon: 'star', min: 800 },
  6: { id: 6, name: '6ta', color: '#94A3B8', starColor: '#94A3B8', icon: 'star', min: 400 },
  7: { id: 7, name: '7ma', color: '#B45309', starColor: '#B45309', icon: 'star', min: 0 },
};

export const getRankByTier = (tier) => RANK_CONFIG[tier] || RANK_CONFIG[7];

export const getCategoryProgress = (stars, tier) => {
    const currentTier = getRankByTier(tier);
    const nextTier = RANK_CONFIG[tier - 1]; // Tier 1 is highest
    
    if (!nextTier) return 100;
    
    const range = nextTier.min - currentTier.min;
    const progress = stars - currentTier.min;
    return Math.min(100, Math.max(0, (progress / range) * 100));
};

export const RANK_ARRAY = Object.values(RANK_CONFIG).sort((a, b) => b.id - a.id); // 7 to 1 for tabs
