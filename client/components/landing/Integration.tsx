import React from "react";
import {
  Github,
  GitPullRequest,
  CircleDot,
  FileText,
  CheckSquare,
  Layout,
  Mail,
  Inbox,
  Send,
  Calendar,
  Clock,
} from "lucide-react";

export function Integration() {
  return (
    <section className="py-24 px-4 w-full max-w-7xl mx-auto -mt-20">
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-[#F97E2C]/30 text-[#F97E2C] text-sm font-medium font-alan bg-white/50 backdrop-blur-sm">
          Integrations
        </div>
        <h2 className="font-instrument text-5xl md:text-6xl font-semibold text-black/90 leading-tight">
          All your work tools,{" "}
          <span className="text-[#F97E2C]">integrated</span>
        </h2>
        <p className="font-alan text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
          Create a single, unified list of all the work you need to do, from any
          of the tools you use.
        </p>
      </div>

      <div className="space-y-6">
        {/* GitHub Card */}
        <div className="group bg-white rounded-[2rem] p-8 md:p-12 border border-black/5 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-[#F97E2C]/5 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h3 className="font-instrument text-3xl font-semibold text-black/90">
              GitHub
            </h3>
            <p className="font-alan text-lg text-black/60 leading-relaxed">
              Track your pull requests and issues directly alongside your daily
              tasks. Never miss a review or urgent bug report again.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-[#F97E2C]/5 group-hover:bg-[#F97E2C]/10 transition-colors duration-300">
              <Github className="w-10 h-10 " />
            </div>
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <GitPullRequest className="w-6 h-6 text-black/70" />
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <CircleDot className="w-6 h-6 text-black/70" />
              </div>
            </div>
          </div>
        </div>

        {/* Notion Card */}
        <div className="group bg-white rounded-[2rem] p-8 md:p-12 border border-black/5 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-[#F97E2C]/5 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h3 className="font-instrument text-3xl font-semibold text-black/90">
              Notion
            </h3>
            <p className="font-alan text-lg text-black/60 leading-relaxed">
              Sync your workspace tasks and documents. seamless access to your
              knowledge base without leaving your focus zone.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="p-2 rounded-2xl  bg-[#F97E2C]/5 group-hover:bg-[#F97E2C]/10 transition-colors duration-300">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-14"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M5.716 29.2178L2.27664 24.9331C1.44913 23.9023 1 22.6346 1 21.3299V5.81499C1 3.86064 2.56359 2.23897 4.58071 2.10125L20.5321 1.01218C21.691 0.933062 22.8428 1.24109 23.7948 1.8847L29.3992 5.67391C30.4025 6.35219 31 7.46099 31 8.64426V26.2832C31 28.1958 29.4626 29.7793 27.4876 29.9009L9.78333 30.9907C8.20733 31.0877 6.68399 30.4237 5.716 29.2178Z"
                    fill="white"
                  ></path>{" "}
                  <path
                    d="M11.2481 13.5787V13.3756C11.2481 12.8607 11.6605 12.4337 12.192 12.3982L16.0633 12.1397L21.417 20.0235V13.1041L20.039 12.9204V12.824C20.039 12.303 20.4608 11.8732 20.9991 11.8456L24.5216 11.6652V12.1721C24.5216 12.41 24.3446 12.6136 24.1021 12.6546L23.2544 12.798V24.0037L22.1906 24.3695C21.3018 24.6752 20.3124 24.348 19.8036 23.5803L14.6061 15.7372V23.223L16.2058 23.5291L16.1836 23.6775C16.1137 24.1423 15.7124 24.4939 15.227 24.5155L11.2481 24.6926C11.1955 24.1927 11.5701 23.7456 12.0869 23.6913L12.6103 23.6363V13.6552L11.2481 13.5787Z"
                    fill="#000000"
                  ></path>{" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M20.6749 2.96678L4.72347 4.05585C3.76799 4.12109 3.02734 4.88925 3.02734 5.81499V21.3299C3.02734 22.1997 3.32676 23.0448 3.87843 23.7321L7.3178 28.0167C7.87388 28.7094 8.74899 29.0909 9.65435 29.0352L27.3586 27.9454C28.266 27.8895 28.9724 27.1619 28.9724 26.2832V8.64426C28.9724 8.10059 28.6979 7.59115 28.2369 7.27951L22.6325 3.49029C22.0613 3.10413 21.3702 2.91931 20.6749 2.96678ZM5.51447 6.057C5.29261 5.89274 5.3982 5.55055 5.6769 5.53056L20.7822 4.44711C21.2635 4.41259 21.7417 4.54512 22.1309 4.82088L25.1617 6.96813C25.2767 7.04965 25.2228 7.22563 25.0803 7.23338L9.08387 8.10336C8.59977 8.12969 8.12193 7.98747 7.73701 7.7025L5.51447 6.057ZM8.33357 10.8307C8.33357 10.311 8.75341 9.88177 9.29027 9.85253L26.203 8.93145C26.7263 8.90296 27.1667 9.30534 27.1667 9.81182V25.0853C27.1667 25.604 26.7484 26.0328 26.2126 26.0633L9.40688 27.0195C8.8246 27.0527 8.33357 26.6052 8.33357 26.0415V10.8307Z"
                    fill="#000000"
                  ></path>{" "}
                </g>
              </svg>
            </div>
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <CheckSquare className="w-6 h-6 text-black/70" />
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <Clock/>
              </div>
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div className="group bg-white rounded-[2rem] p-8 md:p-12 border border-black/5 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-[#F97E2C]/5 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h3 className="font-instrument text-3xl font-semibold text-black/90">
              Email
            </h3>
            <p className="font-alan text-lg text-black/60 leading-relaxed">
              Turn emails into clear action items. Clear your inbox and your
              mind by organizing correspondence into your daily plan.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="p-2 rounded-2xl bg-[#F97E2C]/5 group-hover:bg-[#F97E2C]/10 transition-colors duration-300">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-14"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z"
                    fill="white"
                  ></path>{" "}
                  <path
                    d="M22.0515 8.52295L16.0644 13.1954L9.94043 8.52295V8.52421L9.94783 8.53053V15.0732L15.9954 19.8466L22.0515 15.2575V8.52295Z"
                    fill="#EA4335"
                  ></path>{" "}
                  <path
                    d="M23.6231 7.38639L22.0508 8.52292V15.2575L26.9983 11.459V9.17074C26.9983 9.17074 26.3978 5.90258 23.6231 7.38639Z"
                    fill="#FBBC05"
                  ></path>{" "}
                  <path
                    d="M22.0508 15.2575V23.9924H25.8428C25.8428 23.9924 26.9219 23.8813 26.9995 22.6513V11.459L22.0508 15.2575Z"
                    fill="#34A853"
                  ></path>{" "}
                  <path
                    d="M9.94811 24.0001V15.0732L9.94043 15.0669L9.94811 24.0001Z"
                    fill="#C5221F"
                  ></path>{" "}
                  <path
                    d="M9.94014 8.52404L8.37646 7.39382C5.60179 5.91001 5 9.17692 5 9.17692V11.4651L9.94014 15.0667V8.52404Z"
                    fill="#C5221F"
                  ></path>{" "}
                  <path
                    d="M9.94043 8.52441V15.0671L9.94811 15.0734V8.53073L9.94043 8.52441Z"
                    fill="#C5221F"
                  ></path>{" "}
                  <path
                    d="M5 11.4668V22.6591C5.07646 23.8904 6.15673 24.0003 6.15673 24.0003H9.94877L9.94014 15.0671L5 11.4668Z"
                    fill="#4285F4"
                  ></path>{" "}
                </g>
              </svg>
            </div>
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <Inbox className="w-6 h-6 text-black/70" />
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-black/5 shadow-sm">
                <Send className="w-6 h-6 text-black/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
