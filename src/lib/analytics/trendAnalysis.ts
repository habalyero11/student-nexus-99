/**
 * Grade Trend Analysis
 * Detects performance patterns and forecasts future grades
 */

import type { GradeData } from './types';

export type TrendType = 'improving' | 'declining' | 'stable' | 'volatile';

export interface TrendAnalysis {
    type: TrendType;
    confidence: number; // 0-100
    description: string;
    changePercentage: number;
}

/**
 * Analyze grade trend from historical data
 */
export function analyzeTrend(grades: number[]): TrendAnalysis {
    if (grades.length < 2) {
        return {
            type: 'stable',
            confidence: 0,
            description: 'Insufficient data for trend analysis',
            changePercentage: 0
        };
    }

    // Calculate first half vs second half averages
    const halfIndex = Math.floor(grades.length / 2);
    const firstHalf = grades.slice(0, halfIndex);
    const secondHalf = grades.slice(halfIndex);

    const firstAvg = average(firstHalf);
    const secondAvg = average(secondHalf);
    const change = secondAvg - firstAvg;
    const changePercentage = (change / firstAvg) * 100;

    // Calculate volatility (standard deviation)
    const volatility = standardDeviation(grades);

    // Determine trend type
    let type: TrendType;
    let description: string;
    let confidence: number;

    if (volatility > 10) {
        type = 'volatile';
        description = 'Performance shows significant fluctuations';
        confidence = 70;
    } else if (change >= 5) {
        type = 'improving';
        description = `Performance improving by ${change.toFixed(1)}%`;
        confidence = Math.min(95, 60 + Math.abs(change) * 5);
    } else if (change <= -5) {
        type = 'declining';
        description = `Performance declining by ${Math.abs(change).toFixed(1)}%`;
        confidence = Math.min(95, 60 + Math.abs(change) * 5);
    } else {
        type = 'stable';
        description = 'Performance remains consistent';
        confidence = 80;
    }

    return {
        type,
        confidence,
        description,
        changePercentage
    };
}

/**
 * Forecast future grade based on current trajectory
 */
export function forecastGrade(grades: number[], quartersAhead: number = 1): {
    predicted: number;
    confidence: number;
    range: { min: number; max: number };
} {
    if (grades.length < 2) {
        const current = grades[0] || 75;
        return {
            predicted: current,
            confidence: 0,
            range: { min: current - 10, max: current + 10 }
        };
    }

    // Simple linear regression
    const n = grades.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = grades;

    const sumX = sum(x);
    const sumY = sum(y);
    const sumXY = sum(x.map((xi, i) => xi * y[i]));
    const sumX2 = sum(x.map(xi => xi * xi));

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict future quarter
    const futureX = n + quartersAhead;
    const predicted = slope * futureX + intercept;

    // Calculate confidence based on R-squared
    const yMean = average(y);
    const ssTotal = sum(y.map(yi => Math.pow(yi - yMean, 2)));
    const ssResidual = sum(y.map((yi, i) => Math.pow(yi - (slope * x[i] + intercept), 2)));
    const rSquared = 1 - (ssResidual / ssTotal);
    const confidence = Math.max(0, Math.min(100, rSquared * 100));

    // Calculate prediction range (±1 standard error)
    const stdError = Math.sqrt(ssResidual / (n - 2));
    const range = {
        min: Math.max(0, predicted - stdError),
        max: Math.min(100, predicted + stdError)
    };

    return {
        predicted: Math.max(0, Math.min(100, predicted)),
        confidence,
        range
    };
}

/**
 * Detect sudden performance drops
 */
export function detectSuddenDrop(grades: number[], threshold: number = 10): {
    detected: boolean;
    quarter?: number;
    drop?: number;
} {
    for (let i = 1; i < grades.length; i++) {
        const drop = grades[i - 1] - grades[i];
        if (drop >= threshold) {
            return {
                detected: true,
                quarter: i + 1,
                drop
            };
        }
    }

    return { detected: false };
}

// Helper functions
function average(numbers: number[]): number {
    return sum(numbers) / numbers.length;
}

function sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
}

function standardDeviation(numbers: number[]): number {
    const avg = average(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    const avgSquareDiff = average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}
