import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle?: string;
  redirectPath?: string;
}

const AuthRequiredModal = ({ 
  isOpen, 
  onClose, 
  jobTitle = 'this job',
  redirectPath = '/jobs'
}: AuthRequiredModalProps) => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleLogin = () => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/login', { state: { from: redirectPath } });
      onClose();
    }, 500);
  };

  const handleRegister = () => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/register', { state: { from: redirectPath } });
      onClose();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <DialogTitle className="text-xl">Authentication Required</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <p className="text-foreground font-medium mb-2">
              Sign in to apply for <span className="text-primary">{jobTitle}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Create a free account or log in to your existing account to apply for jobs, track applications, and get personalized job matches.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Get started in seconds:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Save and track your applications
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Get personalized job recommendations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Receive instant notifications via WhatsApp, Email & Telegram
              </li>
            </ul>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isNavigating}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              variant="secondary"
              onClick={handleRegister}
              disabled={isNavigating}
              className="flex-1 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isNavigating ? 'Loading...' : 'Create Account'}
            </Button>
            <Button
              variant="default"
              onClick={handleLogin}
              disabled={isNavigating}
              className="flex-1 gap-2"
            >
              <LogIn className="h-4 w-4" />
              {isNavigating ? 'Loading...' : 'Sign In'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;
