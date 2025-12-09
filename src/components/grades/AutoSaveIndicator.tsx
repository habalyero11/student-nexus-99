import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AutoSaveIndicatorProps {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  error?: string;
  onSaveNow?: () => void;
  onRetry?: () => void;
  className?: string;
}

const AutoSaveIndicator = ({
  status,
  lastSaved,
  error,
  onSaveNow,
  onRetry,
  className = ""
}: AutoSaveIndicatorProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'saved':
        return <CheckCircle className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Save className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending save...';
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved
          ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
          : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return 'Ready';
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'saving':
        return 'secondary';
      case 'saved':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTooltipContent = () => {
    switch (status) {
      case 'pending':
        return 'Changes will be auto-saved in a moment...';
      case 'saving':
        return 'Saving your changes to the server...';
      case 'saved':
        return lastSaved
          ? `Last saved: ${lastSaved.toLocaleString()}`
          : 'All changes have been saved';
      case 'error':
        return error || 'Failed to save changes. Your work is backed up locally.';
      default:
        return 'No unsaved changes';
    }
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Badge variant={getStatusVariant()} className="flex items-center gap-1.5 px-2 py-1">
                {getStatusIcon()}
                <span className="text-xs font-medium">{getStatusText()}</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>

        {/* Action buttons for manual save or retry */}
        {status === 'pending' && onSaveNow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveNow}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Save now</p>
            </TooltipContent>
          </Tooltip>
        )}

        {status === 'error' && onRetry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Retry save</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AutoSaveIndicator;