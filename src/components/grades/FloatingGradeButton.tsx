import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import QuickGradeModal from "./QuickGradeModal";
import { Plus, Zap } from "lucide-react";

interface FloatingGradeButtonProps {
  onGradeAdded?: () => void;
}

const FloatingGradeButton = ({ onGradeAdded }: FloatingGradeButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      // ESC to close modal
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSuccess = () => {
    setIsModalOpen(false);
    onGradeAdded?.();
  };

  return (
    <TooltipProvider>
      <>
        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <div className="relative">
                  <Plus className="h-6 w-6" />
                  <Zap className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="mr-2">
              <div className="text-center">
                <div className="font-medium">Quick Grade Entry</div>
                <div className="text-xs text-muted-foreground">Ctrl+G</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Quick Grade Modal */}
        <QuickGradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </>
    </TooltipProvider>
  );
};

export default FloatingGradeButton;