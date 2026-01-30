import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const DEFAULT_PASSWORD = "1234";

interface DefaultPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DefaultPasswordDialog({ open, onOpenChange }: DefaultPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Default password
          </DialogTitle>
          <DialogDescription>
            Use this password to sign in to the Student Portal. Only the password is shown here.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/50 px-4 py-3 font-mono text-lg font-semibold tracking-wider text-foreground">
          {DEFAULT_PASSWORD}
        </div>
        <p className="text-sm text-muted-foreground">
          Ask your advisor to change it if you’ve been given a different password.
        </p>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
