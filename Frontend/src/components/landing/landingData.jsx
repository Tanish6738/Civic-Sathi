// Centralized data & assets for the Landing page components (JSX allowed)
import {
  FaHome,
  FaTint,
  FaTrash,
  FaFileAlt,
  FaBriefcase,
  FaUtensils,
  FaUserPlus,
  FaLayerGroup,
  FaMicrophone,
  FaRegClock,
  FaRegCommentDots,
  FaBaby,
  FaRing,
  FaFileInvoice,
  FaTree,
} from "react-icons/fa";
import {
  HomeIcon,
  IdentificationIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  BugAntIcon,
} from "@heroicons/react/24/solid";

// Local image assets (Vite will optimize and hash these on build)
import img1 from "../../assets/1.png";
import img2 from "../../assets/2.png";
import img3 from "../../assets/3.png";
import supportPhone from "../../assets/supportPhone.png";
import qrPng from "../../assets/qrcode.png";

// Public logo (could reuse one of the hero images or a dedicated logo file later)
export const Logo = img1;

// Hero slider images (previously referenced undefined Image1; now fixed)
export const images = [img1, img2, img3];

// Support visuals
export const Phonephoto = supportPhone;
export const Qrcode = qrPng;

export const cardData = [
  { icon: <FaHome />, title: "Property Tax Application", subtitle: "Pay & manage your property tax easily" },
  { icon: <FaTint />, title: "Water & Sewerage Connection", subtitle: "Apply for water and sewerage services" },
  { icon: <FaTrash />, title: "Solid Waste Management", subtitle: "Request waste collection and track status" },
  { icon: <FaFileAlt />, title: "Birth / Death / Marriage Certificate", subtitle: "Get vital records quickly" },
  { icon: <FaBriefcase />, title: "Trade & Business License", subtitle: "Apply or renew municipal trade licenses" },
  { icon: <FaUtensils />, title: "Restaurant / Food Permit", subtitle: "Get approvals for food and hospitality" },
];

export const categories = [
  { id: 1, name: "Property Tax Application", icon: <HomeIcon className="h-5 w-5 text-blue-600" />, bg: "bg-blue-100" },
  { id: 2, name: "Water & Sewerage Connection", icon: <ClipboardDocumentCheckIcon className="h-5 w-5 text-indigo-600" />, bg: "bg-indigo-100" },
  { id: 3, name: "Solid Waste Management", icon: <BugAntIcon className="h-5 w-5 text-green-600" />, bg: "bg-green-100" },
  { id: 4, name: "Birth / Death / Marriage Certificate", icon: <IdentificationIcon className="h-5 w-5 text-pink-600" />, bg: "bg-pink-100" },
  { id: 5, name: "Trade & Business License", icon: <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />, bg: "bg-purple-100" },
  { id: 6, name: "Restaurant / Food Permit", icon: <SparklesIcon className="h-5 w-5 text-yellow-600" />, bg: "bg-yellow-100" },
  { id: 7, name: "Tree Cutting & Environmental NOC", icon: <DocumentTextIcon className="h-5 w-5 text-teal-600" />, bg: "bg-teal-100" },
  { id: 8, name: "Grievances & Service Requests", icon: <UserGroupIcon className="h-5 w-5 text-red-600" />, bg: "bg-red-100" },
];

export const steps = [
  { icon: <FaUserPlus className="text-blue-600 text-3xl" />, label: "Register Yourself" },
  { icon: <FaLayerGroup className="text-yellow-600 text-3xl" />, label: "Select Category" },
  { icon: <FaMicrophone className="text-green-600 text-3xl" />, label: "Voice Assistant" },
];

export const stepDescriptions = [
  "Create your secure profile and verify quickly",
  "Browse or search and pick the service you need",
  "Use voice or text to fill & submit effortlessly",
];

export const services = [
  { name: "Citizen Charter Timeline", icon: <FaRegClock /> },
  { name: "Grievances", icon: <FaRegCommentDots /> },
  { name: "Death Certificate", icon: <FaFileAlt /> },
  { name: "Birth Certificate", icon: <FaBaby /> },
  { name: "Marriage Certificate", icon: <FaRing /> },
  { name: "Property Tax", icon: <FaHome /> },
  { name: "Water Charges", icon: <FaTint /> },
  { name: "Solid Waste Management", icon: <FaTrash /> },
  { name: "Bill Tracking", icon: <FaFileInvoice /> },
  { name: "Business", icon: <FaBriefcase /> },
  { name: "Restaurant Licenses", icon: <FaUtensils /> },
  { name: "Tree Cutting Approvals", icon: <FaTree /> },
];

export const landingData = { images, cardData, categories, steps, stepDescriptions, services, Phonephoto, Qrcode };
