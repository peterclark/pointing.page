import { HomeIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

const HomeButton = () => {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate("/");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleHomeClick}
      className="rounded-full fixed top-0 left-0 m-6 h-10 w-10 cursor-pointer z-10"
    >
      <HomeIcon />
    </Button>
  );
};

export default HomeButton;
