import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { Bell, BookDashed, CreditCard, FerrisWheelIcon, ImageDown, ProjectorIcon, School2, Speaker } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <UserCircleIcon />,
    name: "Student Profiles",
    path: "/profile",
  },
  {
    icon: <FerrisWheelIcon />,
    name: "Free Videos",
    path: "/free-videos",
  },
  {
    name: "Courses",
    icon: <ListIcon />,
    subItems: [
      { name: "All Courses", path: "/all-courses" },
      { name: "Programs", path: "/all-programs" },
      { name: "Subjects", path: "/all-subject" },
    ],
  },
  {
    name: "New Testseries",
    icon: <ListIcon />,
    subItems: [
      { name: "Testseries", path: "/new-admin" },
      { name: "Tests", path: "/new-testsPage" },
      { name: "Questions", path: "/new-questions" },
    ],
  },
  {
    name: "Quizzes ",
    icon: <ListIcon />,
    subItems: [
      { name: "All Quizzes", path: "/all-quizzes" },
      { name: "All Quizzes Bundle", path: "/all-quiz-bundles" },
      // { name: "All Test Series", path: "/all-test-series" },
      // { name: "All Test Series Bundle", path: "/all-test-series-bundle" },
    ],
  },
  {
    icon: <BookDashed />,
    name: "Study Materials",
    subItems: [
      { name: "All Study Materials Categories", path: "/all-study-material-categories" },
      { name: "All Study Materials", path: "/all-study-material" },
      { name: "All Study material purchase", path: "/all-test-series-purchase" },
      { name: "Assign Material", path: "/assign-material" }

    ],
  },
  {
    icon: <Speaker />,
    name: "Announcements",
    path: "/announcements",
  },
  {
    icon: <Bell />,
    name: "Send Notifications",
    path: "/send-notification",
  },
  {
    icon: <ImageDown />,
    name: "App Banners",
    path: "/app-baners",
  },
  {
    icon: <ImageDown />,
    name: "App Assets",
    path: "/app-assets",
  },
  {
    icon: <ProjectorIcon />,
    name: "App Categories",
    path: "/app-Categories",
  },
  {
    icon: <ImageDown />,
    name: "FAQs",
    path: "/all-faqs",
  },
  {
    icon: <ImageDown />,
    name: "Doubts",
    path: "/all-doubts",
  },
  {
    name: "Payments",
    icon: <CreditCard />,
    subItems: [
      { name: "All Transactions", path: "/payments/transactions" },
      { name: "Coupon Codes", path: "/payments/coupons" }
    ],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "About Us", path: "/about-us" },
      { name: "Privacy Policy", path: "/privacy-policy" },
      { name: "Terms & Conditions", path: "/term-and-condition" },
    ],
  },
  {
    name: "Scholarship",
    icon: <School2 />,
    subItems: [
      { name: "Scholarship", path: "/scholarship" },
      { name: "Scholarship Apply", path: "/scholarship-apply" },
    ],
  },
];

const othersItems: NavItem[] = [];

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;

    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((sub) => {
            if (isActive(sub.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const ref = subMenuRefs.current[key];
      if (ref) {
        setSubMenuHeight((prev) => ({ ...prev, [key]: ref.scrollHeight }));
      }
    }
  }, [openSubmenu]);

  const toggleSubmenu = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) =>
      prev?.type === menuType && prev?.index === index
        ? null
        : { type: menuType, index }
    );
  };

  const showFullText = isExpanded || isHovered || isMobileOpen;

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-3">
      {items.map((item, idx) => (
        <li key={item.name}>
          {item.subItems ? (
            <button
              onClick={() => toggleSubmenu(idx, menuType)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors
                ${openSubmenu?.type === menuType && openSubmenu?.index === idx
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                } ${!showFullText && "justify-center"}`}
            >
              <span className="flex-shrink-0 text-xl">{item.icon}</span>
              {showFullText && (
                <>
                  <span className="flex-1 text-left font-medium">{item.name}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 transition-transform ${openSubmenu?.type === menuType && openSubmenu?.index === idx
                      ? "rotate-180"
                      : ""
                      }`}
                  />
                </>
              )}
            </button>
          ) : (
            item.path && (
              <Link
                to={item.path}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors
                  ${isActive(item.path)
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  } ${!showFullText && "justify-center"}`}
              >
                <span className="flex-shrink-0 text-xl">{item.icon}</span>
                {showFullText && <span className="flex-1 font-medium">{item.name}</span>}
              </Link>
            )
          )}

          {item.subItems && showFullText && (
            <div
              ref={(el) => (subMenuRefs.current[`${menuType}-${idx}`] = el)}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === idx
                    ? `${subMenuHeight[`${menuType}-${idx}`] ?? 0}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-1 pl-11">
                {item.subItems.map((sub) => (
                  <li key={sub.name}>
                    <Link
                      to={sub.path}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors
                        ${isActive(sub.path)
                          ? "bg-brand-100 text-brand-700 dark:bg-brand-800/40 dark:text-brand-300"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        {sub.name}
                        <div className="flex gap-1.5">
                          {sub.new && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-800/40 dark:text-green-300">
                              new
                            </span>
                          )}
                          {sub.pro && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-800/40 dark:text-purple-300">
                              pro
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-[999999] mt-16 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 lg:mt-0
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${isExpanded || isHovered ? "w-72" : "w-20"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`p-6 flex ${showFullText ? "justify-start" : "justify-center"}`}>
        <Link to="/">
          {showFullText ? (
            <img
              src="/images/logo/logo.png"
              alt="Logo"
              className="h-10 w-auto dark:hidden"
            />
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              className="h-8 w-8"
            />
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <nav>
          <div className="mb-8">
            <h2
              className={`mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400
                ${showFullText ? "text-left" : "text-center"}`}
            >
              {showFullText ? "Menu" : <HorizontaLDots className="mx-auto h-6 w-6" />}
            </h2>
            {renderMenuItems(navItems, "main")}
          </div>

          {othersItems.length > 0 && (
            <div>
              <h2
                className={`mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400
                  ${showFullText ? "text-left" : "text-center"}`}
              >
                {showFullText ? "Others" : <HorizontaLDots className="mx-auto h-6 w-6" />}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;