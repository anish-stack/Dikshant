import { View, ActivityIndicator, Image } from "react-native";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/auth.store";
import { colors } from "../../constant/color";

export default function Splash({ navigation }) {
  const { checkLogin } = useAuthStore(); 

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await checkLogin();

      setTimeout(() => {
        if (!isMounted) return;

        const { loggedIn } = useAuthStore.getState();

        console.log("Correct latest loggedIn:", loggedIn);

        if (loggedIn) {
          navigation.replace("Home");
        } else {
          navigation.replace("Login");
        }
      }, 800);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.white,
      }}
    >
      <Image
        source={require("../../assets/small.png")}
        style={{ width: 200, resizeMode: "contain" }}
      />

      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
