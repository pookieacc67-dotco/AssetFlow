import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAssetFlow } from "../state";
import { 
  Mail, 
  Lock, 
  Building, 
  ArrowLeft, 
  User, 
  Check, 
  Compass,
  AlertCircle,
  CheckCircle
} from "lucide-react";
// @ts-expect-error - Static image asset import
import logoUrl from "../assets/images/logo.jpg";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthProps {
  onNavigate: (view: "home" | "about" | "app" | "pending") => void;
  initialStep?: "landing" | "login" | "create" | "join";
}

export const Auth: React.FC<AuthProps> = ({ onNavigate, initialStep = "landing" }) => {
  const { signUpAdmin, signUpEmployee, login, organizations, users } = useAssetFlow();
  
  const [step, setStep] = useState<"landing" | "login" | "create" | "join" | "pending">(() => {
    if (initialStep === "login") return "login";
    if (initialStep === "create") return "create";
    if (initialStep === "join") return "join";
    return "landing";
  });

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Auth processing status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Derive the domain-matched organization and warnings dynamically from email input
  const { domainMatchedOrg, domainWarning } = useMemo(() => {
    const isEmailValid = email.includes("@") && email.includes(".");
    if (isEmailValid) {
      const emailDomain = email.split("@")[1].trim().toLowerCase();
      const freeProviders = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com", "live.com", "msn.com", "aol.com", "mail.com"];
      
      if (freeProviders.includes(emailDomain)) {
        return {
          domainMatchedOrg: null,
          domainWarning: `Auto-matching disabled for personal domains (${emailDomain}). Please enter an Org Code.`
        };
      } else {
        const matchingUser = users.find(u => u.email && u.email.toLowerCase().endsWith("@" + emailDomain));
        if (matchingUser) {
          const org = organizations.find(o => o.id === matchingUser.organizationId);
          if (org) {
            return { domainMatchedOrg: org, domainWarning: null };
          }
        }
      }
    }
    return { domainMatchedOrg: null, domainWarning: null };
  }, [email, organizations, users]);

  // Sync orgCode when a domain-matched organization is found
  useEffect(() => {
    if (domainMatchedOrg) {
      setOrgCode(domainMatchedOrg.id);
    }
  }, [domainMatchedOrg]);

  // Derive explicit Org Code match name dynamically
  const matchedOrgName = useMemo(() => {
    if (domainMatchedOrg) {
      return domainMatchedOrg.name;
    }
    if (orgCode.trim()) {
      const match = organizations.find(
        o => o.id.toLowerCase() === orgCode.trim().toLowerCase() || 
             o.name.toLowerCase().includes(orgCode.trim().toLowerCase())
      );
      return match ? match.name : null;
    }
    return null;
  }, [orgCode, domainMatchedOrg, organizations]);

  const handleOAuthClick = (provider: "google" | "github") => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (auth && auth.app && auth.app.options && auth.app.options.apiKey) {
      const providerInstance = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
      if (provider === "github") {
        (providerInstance as GithubAuthProvider).addScope("user:email");
        (providerInstance as GithubAuthProvider).addScope("read:user");
      }

      signInWithPopup(auth, providerInstance)
        .then(async (result) => {
          setIsLoading(false);
          const userEmail = result.user.email;
          if (!userEmail) {
            setErrorMsg(`Could not retrieve email from ${provider === "google" ? "Google" : "GitHub"} account. Please ensure your email is public.`);
            return;
          }
          const displayName = result.user.displayName || (provider === "google" ? "Google User" : "GitHub User");
          const existingUser = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
          
          if (existingUser) {
            const res = login(userEmail);
            if (res.success && res.user) {
              if (res.user.status === "approved") {
                onNavigate("app");
              } else {
                setStep("pending");
              }
            }
          } else {
            setEmail(userEmail);
            setFullName(displayName);
            setStep("landing");
            setSuccessMsg("Authorization successful. Please click Create or Join Organization below to complete your profile.");
          }
        })
        .catch((error: any) => {
          setIsLoading(false);
          setErrorMsg(error.message || `${provider === "google" ? "Google" : "GitHub"} authorization failed.`);
        });
      return;
    }

    // Offline mock fallback
    setTimeout(() => {
      setIsLoading(false);
      const mockEmail = provider === "google" ? "google-user@company.com" : "github-user@company.com";
      const existingUser = users.find(u => u.email === mockEmail);
      
      if (existingUser) {
        const res = login(mockEmail);
        if (res.success && res.user) {
          if (res.user.status === "approved") {
            onNavigate("app");
          } else {
            setStep("pending");
          }
        }
      } else {
        setEmail(mockEmail);
        setFullName(provider === "google" ? "Google User" : "GitHub User");
        setStep("landing");
        setSuccessMsg("Authorization successful. Please click Create or Join Organization below.");
      }
    }, 1000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!fullName.trim() || !companyName.trim() || !email.trim() || !password) {
      setErrorMsg("All registration fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      let idToken = "";
      const loginEmail = email.trim().toLowerCase();
      
      try {
        if (auth && auth.app?.options?.apiKey) {
          const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, password);
          idToken = await userCredential.user.getIdToken();
        }
      } catch (fbErr: any) {
        console.warn("[AssetFlow Auth] Firebase create user note:", fbErr);
        if (fbErr.code === "auth/email-already-in-use") {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
            idToken = await userCredential.user.getIdToken();
          } catch (loginErr) {
            throw new Error("An account with this email already exists. Please log in.");
          }
        } else {
          throw new Error(fbErr.message || "Failed to create account in Firebase.");
        }
      }

      if (!idToken) {
        idToken = `mock_uid_usr-${Math.random().toString(36).substring(2, 9)}_email_${loginEmail}_name_${fullName.replace(/\s+/g, "-")}`;
      }

      const response = await fetch("http://localhost:8000/api/auth/complete-org-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          organization_name: companyName,
          industry: "",
          company_size: ""
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to complete organization registration.");
      }

      const backendData = await response.json();
      const res = signUpAdmin(fullName, companyName, loginEmail, false, backendData.organization_id);
      setIsLoading(false);
      if (res.success) {
        onNavigate("app");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !orgCode.trim() || !email.trim() || !password) {
      setErrorMsg("All fields are required to join an organization.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      let idToken = "";
      const loginEmail = email.trim().toLowerCase();
      
      try {
        if (auth && auth.app?.options?.apiKey) {
          const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, password);
          idToken = await userCredential.user.getIdToken();
        }
      } catch (fbErr: any) {
        console.warn("[AssetFlow Auth] Firebase create user note:", fbErr);
        if (fbErr.code === "auth/email-already-in-use") {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
            idToken = await userCredential.user.getIdToken();
          } catch (loginErr) {
            throw new Error("An account with this email already exists. Please log in.");
          }
        } else {
          throw new Error(fbErr.message || "Failed to create account in Firebase.");
        }
      }

      if (!idToken) {
        idToken = `mock_uid_usr-${Math.random().toString(36).substring(2, 9)}_email_${loginEmail}_name_${fullName.replace(/\s+/g, "-")}`;
      }

      const response = await fetch("http://localhost:8000/api/auth/complete-employee-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          org_code: orgCode
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to submit join request.");
      }

      const res = signUpEmployee(fullName, orgCode, loginEmail, false);
      setIsLoading(false);
      if (res.success) {
        setStep("pending");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      let idToken = "";
      const loginEmail = email.trim().toLowerCase();

      try {
        if (auth && auth.app?.options?.apiKey) {
          const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
          idToken = await userCredential.user.getIdToken();
        }
      } catch (fbErr: any) {
        console.warn("[AssetFlow Auth] Firebase login error:", fbErr);
        if (fbErr.code === "auth/invalid-credential" || fbErr.code === "auth/user-not-found" || fbErr.code === "auth/wrong-password") {
          throw new Error("Invalid email or password. Please try again.");
        } else {
          throw new Error(fbErr.message || "Firebase authentication failed.");
        }
      }

      if (!idToken) {
        idToken = `mock_uid_usr-default_email_${loginEmail}_name_Active-User`;
      }

      const profileRes = await fetch("http://localhost:8000/api/users/me", {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json();
        console.warn("[AssetFlow Auth] Profile backend note:", errData);
      }

      const res = login(loginEmail);
      setIsLoading(false);
      if (res.success && res.user) {
        if (res.user.status === "approved") {
          onNavigate("app");
        } else {
          setStep("pending");
        }
      } else {
        onNavigate("app");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Authentication failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Soft animated gradient wash */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-br rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: "12s" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: "15s" }} />

      {/* Auth card container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white border rounded-[32px] p-8 shadow-xl flex flex-col gap-6 relative">
          
          {/* Back Arrow button */}
          {step !== "pending" && (
            <button 
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                if (step === "landing") {
                  onNavigate("home");
                } else {
                  setStep("landing");
                }
              }}
              className="absolute left-6 top-6 w-9 h-9 rounded-full border border-[#ECECEA] flex items-center justify-center bg-white hover:bg-neutral-50 transition-colors cursor-pointer text-[#5B5E66]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Header Title & Subtitle */}
          <div className="flex flex-col items-center text-center gap-2 mt-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg transform hover:rotate-6 transition-transform">
              <img src={logoUrl} alt="AssetFlow Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#15161A]">
              {step === "landing" && "Welcome to AssetFlow"}
              {step === "login" && "Log in to your workspace"}
              {step === "create" && "Create Organization"}
              {step === "join" && "Join Organization"}
              {step === "pending" && "Request Submitted"}
            </h2>
            <p className="text-xs text-[#5B5E66] max-w-xs">
              {step === "landing" && "Enterprise asset tracking and workspace management made simple."}
              {step === "login" && "Enter your credentials to access your private company account."}
              {step === "create" && "Set up a private multi-tenant workspace for your team."}
              {step === "join" && "Join your team as an employee to book and manage inventory."}
              {step === "pending" && "Your request has been submitted and is awaiting Admin approval."}
            </p>
          </div>

          {/* Error & Success Banners */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-2xl text-xs flex items-start gap-2.5 text-left"
                key="error-banner"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 text-left"
                key="success-banner"
              >
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Landing Step */}
          {step === "landing" && (
            <div className="flex flex-col gap-4">
              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOAuthClick("google")}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-full border border-[#ECECEA] bg-white text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.516 5.516 0 0 1 8.5 13c0-3.038 2.462-5.5 5.5-5.5 1.353 0 2.585.49 3.545 1.296l3.056-3.056C18.773 3.992 16.532 3 14 3 8.477 3 4 7.477 4 13s4.477 10 10 10c5.5 0 9.5-4 9.5-10 0-.61-.053-1.285-.15-1.715H12.24Z" />
                  </svg>
                  Google
                </button>
                <button 
                  onClick={() => handleOAuthClick("github")}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-full border border-[#ECECEA] bg-white text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  GitHub
                </button>
              </div>

              <div className="relative flex items-center justify-center my-1.5">
                <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">or</span>
                <hr className="w-full border-[#ECECEA]" />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setStep("create")}
                  className="w-full py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-sm font-semibold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Building className="w-4 h-4" /> Create Organization (Admin)
                </button>
                <button 
                  onClick={() => setStep("join")}
                  className="w-full py-3 rounded-full border border-[#ECECEA] bg-white text-sm font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Join Organization (Employee)
                </button>
              </div>

              <div className="text-center mt-3">
                <span className="text-xs text-[#5B5E66]">Already have an account? </span>
                <button 
                  onClick={() => setStep("login")}
                  className="text-xs font-bold text-[#15161A] hover:underline cursor-pointer"
                >
                  Login
                </button>
              </div>
            </div>
          )}

          {/* Login Step */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-neutral-600">Password</label>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A] transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-sm font-semibold transition-colors cursor-pointer mt-2 shadow-md flex items-center justify-center"
              >
                {isLoading ? "Signing in..." : "Log In"}
              </button>

              <div className="relative flex items-center justify-center my-1">
                <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">or sign in with</span>
                <hr className="w-full border-[#ECECEA]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => handleOAuthClick("google")}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-full border border-[#ECECEA] bg-white text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.516 5.516 0 0 1 8.5 13c0-3.038 2.462-5.5 5.5-5.5 1.353 0 2.585.49 3.545 1.296l3.056-3.056C18.773 3.992 16.532 3 14 3 8.477 3 4 7.477 4 13s4.477 10 10 10c5.5 0 9.5-4 9.5-10 0-.61-.053-1.285-.15-1.715H12.24Z" />
                  </svg>
                  Google
                </button>
                <button 
                  type="button"
                  onClick={() => handleOAuthClick("github")}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-full border border-[#ECECEA] bg-white text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  GitHub
                </button>
              </div>

              <div className="text-center mt-2">
                <span className="text-xs text-[#5B5E66]">Don't have an account? </span>
                <button 
                  type="button"
                  onClick={() => setStep("landing")}
                  className="text-xs font-bold text-[#15161A] hover:underline cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* Create Organization Step (Admin Setup) */}
          {step === "create" && (
            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Your Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><User className="w-4 h-4" /></span>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Company / Organization Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><Building className="w-4 h-4" /></span>
                  <input 
                    type="text" 
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Logistics"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Work Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><Mail className="w-4 h-4" /></span>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@acme.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-600">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-xs focus:outline-none focus:border-[#15161A]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-600">Confirm Password</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-xs focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-sm font-semibold transition-colors cursor-pointer mt-2 shadow-md flex items-center justify-center"
              >
                {isLoading ? "Creating Workspace..." : "Create Organization"}
              </button>
              
              <div className="text-[11px] text-center text-[#5B5E66] mt-1">
                Creating an organization designates you as the <strong>Admin</strong>.
              </div>
            </form>
          )}

          {/* Join Organization Step (Employee Registration) */}
          {step === "join" && (
            <form onSubmit={handleJoinOrg} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Your Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><User className="w-4 h-4" /></span>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-neutral-600">Organization Code or Name</label>
                  <span className="text-[10px] text-[#5B5E66]">(e.g., ORG_123456)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><Building className="w-4 h-4" /></span>
                  <input 
                    type="text" 
                    required
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    placeholder="Enter code..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>

                {/* Domain matching feedback */}
                <AnimatePresence mode="wait">
                  {domainMatchedOrg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1 px-1"
                      key="domain-match"
                    >
                      <Check className="w-3.5 h-3.5" /> Auto-matched: {domainMatchedOrg.name} (via domain)
                    </motion.div>
                  )}

                  {!domainMatchedOrg && matchedOrgName && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-1 px-1"
                      key="org-match"
                    >
                      <Check className="w-3.5 h-3.5" /> We found {matchedOrgName} — you'll join automatically.
                    </motion.div>
                  )}

                  {domainWarning && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-amber-600 font-bold flex items-start gap-1 mt-1 px-1"
                      key="domain-warning"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{domainWarning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-600">Work Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B5E66]"><Mail className="w-4 h-4" /></span>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-sm focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-600">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-xs focus:outline-none focus:border-[#15161A]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-600">Confirm Password</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-[#ECECEA] bg-white text-xs focus:outline-none focus:border-[#15161A]"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-sm font-semibold transition-colors cursor-pointer mt-2 shadow-md flex items-center justify-center"
              >
                {isLoading ? "Submitting Request..." : "Join Organization"}
              </button>
              
              <div className="text-[11px] text-center text-[#5B5E66] mt-1">
                Your account will start with standard <strong>Employee</strong> rights pending approval.
              </div>
            </form>
          )}

          {/* Pending Approval Screen */}
          {step === "pending" && (
            <div className="flex flex-col items-center text-center gap-5 my-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-[#15161A]">
                <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-base text-[#15161A]">Request Submitted Successfully</span>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Your account has been created in Firebase. Once your company Admin approves your profile on the team directory, your workspace will load automatically on login.
                </p>
              </div>

              <button 
                onClick={() => {
                  setStep("landing");
                  onNavigate("home");
                }}
                className="px-6 py-2.5 rounded-full border border-[#ECECEA] bg-white text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Return Home
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
