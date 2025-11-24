import { LogInIcon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";

const ProfileButton = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const handleAccountClick = () => {
    navigate("/profile");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleAccountClick}
      className="ProfileButton rounded-full fixed top-0 right-0 m-6 h-10 w-10 cursor-pointer z-10"
      disabled={isLoading}
    >
      {isAuthenticated ? <User /> : <LogInIcon aria-label="sign in" />}
    </Button>
  );
};

export default ProfileButton;
