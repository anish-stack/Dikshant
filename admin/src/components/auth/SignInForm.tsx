import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { API_URL } from "../../constant/constant";
import axios from "axios";

/* ======================
   TYPES
====================== */
interface SignInFormData {
  email: string;
  password: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "superadmin";
}

interface LoginResponse {
  token: string;
  refresh_token: string;
  user: User;
  error?: string;
}


export default function SignInForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  /* ======================
      HANDLE SUBMIT
  ====================== */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
   
      const response = await axios.post(`${API_URL}/auth/admin-login`, formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: LoginResponse = await response.data;

      if (!response.data.success) {
        setError(data.error || "Login failed");
        return;
      }


      // ====================== */
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("refreshToken", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isLoggedIn", "true");

      if (isChecked) {
        localStorage.setItem("keepLoggedIn", "true");
      }

      /* ======================
          REDIRECT
      ====================== */
      navigate("/");
    } catch (err) {
      console.error(err);
      console.log("Internal server error",err)
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-6">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white">
              Admin Sign In
            </h1>
            <p className="text-sm text-gray-500">
              Enter your admin credentials
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-500 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* EMAIL */}
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="admin@gmail.com"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>
                  Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeIcon className="size-5 fill-gray-500" />
                    ) : (
                      <EyeCloseIcon className="size-5 fill-gray-500" />
                    )}
                  </span>
                </div>
              </div>

              {/* KEEP LOGGED IN */}
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <span className="text-sm text-gray-700">
                  Keep me logged in
                </span>
              </div>

              {/* SUBMIT */}
              <Button
                className="w-full"
                size="sm"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
