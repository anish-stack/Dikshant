import { useFonts } from "expo-font";
import { useEffect } from "react";

const useFontStyle = () => {
  const [loaded, error] = useFonts({
    Geist: require("../assets/fonts/Geist-VariableFont_wght.ttf"),
    GeistMono: require("../assets/fonts/GeistMono-VariableFont_wght.ttf"),
  });

  useEffect(() => {
    if (error) {
      console.log("Font load error:", error);
    }
  }, [error]);

  return loaded;
};

export default useFontStyle;
