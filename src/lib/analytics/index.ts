/**
 * Analytics Library - Main Export
 * Rule-based predictive analytics system
 */

export * from './types';
export * from './riskScoring';
export * from './remarksGenerator';
export * from './trendAnalysis';
export * from './interventions';

// Re-export commonly used functions for convenience
export { calculateRiskScore, getRiskLevel } from './riskScoring';
export { generateRemarks } from './remarksGenerator';
export { analyzeTrend, forecastGrade } from './trendAnalysis';
export { generateInterventions } from './interventions';
