import { useState, useEffect } from 'react';

interface GradeDefaults {
  lastSubject: string;
  lastQuarter: string;
  lastYearLevel: string;
  lastSection: string;
  recentGradeValues: {
    writtenWork: number | null;
    performanceTask: number | null;
    quarterlyAssessment: number | null;
  };
}

const STORAGE_KEY = 'gradeEntryDefaults';

const initialDefaults: GradeDefaults = {
  lastSubject: '',
  lastQuarter: '1st',
  lastYearLevel: '',
  lastSection: '',
  recentGradeValues: {
    writtenWork: null,
    performanceTask: null,
    quarterlyAssessment: null,
  },
};

export const useGradeDefaults = () => {
  const [defaults, setDefaults] = useState<GradeDefaults>(initialDefaults);

  // Load defaults from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDefaults({ ...initialDefaults, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load grade defaults from localStorage:', error);
    }
  }, []);

  // Save defaults to localStorage whenever they change
  const updateDefaults = (newDefaults: Partial<GradeDefaults>) => {
    const updated = { ...defaults, ...newDefaults };
    setDefaults(updated);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save grade defaults to localStorage:', error);
    }
  };

  // Update last used subject and quarter
  const updateLastUsed = (subject: string, quarter: string, yearLevel?: string, section?: string) => {
    updateDefaults({
      lastSubject: subject,
      lastQuarter: quarter,
      ...(yearLevel && { lastYearLevel: yearLevel }),
      ...(section && { lastSection: section }),
    });
  };

  // Update recent grade values for quick reuse
  const updateRecentGrades = (writtenWork: number | null, performanceTask: number | null, quarterlyAssessment: number | null) => {
    updateDefaults({
      recentGradeValues: {
        writtenWork,
        performanceTask,
        quarterlyAssessment,
      },
    });
  };

  // Get suggested next student based on patterns
  const getSuggestedStudent = (students: any[], currentStudentId?: string) => {
    if (!currentStudentId || students.length === 0) {
      // Suggest first student without grades for the last used subject/quarter
      return students[0]?.id || '';
    }

    const currentIndex = students.findIndex(s => s.id === currentStudentId);
    if (currentIndex !== -1 && currentIndex < students.length - 1) {
      return students[currentIndex + 1].id;
    }

    return '';
  };

  // Clear all defaults (useful for reset functionality)
  const clearDefaults = () => {
    setDefaults(initialDefaults);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear grade defaults from localStorage:', error);
    }
  };

  return {
    defaults,
    updateLastUsed,
    updateRecentGrades,
    getSuggestedStudent,
    clearDefaults,
  };
};