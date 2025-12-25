import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import AllPrograms from "./pages/Courses/Programs/AllPrograms";
import ViewEdit from "./pages/Courses/Programs/View&Edit";
import AddProgram from "./pages/Courses/Programs/AddProgram";
import AllCourses from "./pages/Courses/Coures/AllCourses";
import ViewCourse from "./pages/Courses/Coures/ViewCourse";
import EditBatch from "./pages/Courses/Coures/EditBatch";
import CreateCourse from "./pages/Courses/Coures/CreateCourse";
import AllSubject from "./pages/Courses/Subjects/AllSubject";
import CourseVideos from "./pages/Courses/Coures/Videos";
import Announcements from "./pages/announcements/announcements";
import Banner from "./pages/Banner/Banner";
import FAQPage from "./pages/faq/faq";
import DoubtsAdmin from "./pages/doubts/doubts";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./ProtectedRoute";
import StudnetsJoined from "./pages/Courses/Coures/StudnetsJoined";
import StudentChats from "./pages/Courses/Coures/StudentChats";
import ViewComments from "./pages/Courses/Coures/ViewComments";

export default function App(){
  return (
    <>
      <Router>
        <ScrollToTop />

        <Routes>
          {/* 🔐 PROTECTED ROUTES */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Others */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* UI */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Programs */}
              <Route path="/all-programs" element={<AllPrograms />} />
              <Route path="/programs" element={<ViewEdit />} />
              <Route path="/programs-add" element={<AddProgram />} />

              {/* Courses */}
              <Route path="/all-courses" element={<AllCourses />} />
              <Route path="/all-courses/view/:id" element={<ViewCourse />} />
              <Route path="/all-courses/edit/:id" element={<EditBatch />} />
              <Route path="/all-courses/add" element={<CreateCourse />} />
              <Route
                path="/all-courses/add-video/:id"
                element={<CourseVideos />}
              />

              {/* Subjects */}
              <Route path="/all-subject" element={<AllSubject />} />
              <Route path="/all-faqs" element={<FAQPage />} />
              <Route path="/all-doubts" element={<DoubtsAdmin />} />

              {/* Announcements */}
              <Route path="/announcements" element={<Announcements />} />

              {/* Banners */}
              <Route path="/app-baners" element={<Banner />} />

              <Route path="/view-studnets-joined/:id" element={<StudnetsJoined />} />
              <Route path="/view-chat/:id" element={<StudentChats />} />
              <Route path="/view-comments-joined/:id" element={<ViewComments />} />




              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          {/* 🔓 PUBLIC ROUTES */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* ❌ NOT FOUND */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      <Toaster position="top-right" />
    </>
  );
}
