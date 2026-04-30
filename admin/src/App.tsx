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
import SendNotification from "./pages/Notifications/SendNotification";
import Settings from "./pages/settings/Settings";
import ScholarshipApply from "./pages/scholarship/ScholarshipApply";
import Scholarship from "./pages/scholarship/Scholarship";
import CreateQuiz from "./pages/Quiz/CreateQuiz";
import AllQuizzesPage from "./pages/Quiz/AllQuiz";
import CreateQuestions from "./pages/Quiz/CreateQuestions";
import Uploadpdf from "./pages/UploadPdf/Upload.pdf";
import AllTestSeries from "./pages/TestSeries/AllTestSeries";
import ViewTestSeries from "./pages/TestSeries/ViewTestSeries";
import EditTestSeries from "./pages/TestSeries/EditTestSeries";
import CreateTestSeries from "./pages/TestSeries/CreateTestSeries";
import ViewSubmission from "./pages/TestSeries/ViewSubmission";
import ViewPurchase from "./pages/TestSeries/ViewPurchase";
import Result from "./pages/TestSeries/Result";
import AllAtempts from "./pages/Quiz/AllAtempts";
import ResultQuiz from "./pages/Quiz/ResultQuiz";
import AppAssets from "./pages/AppAssets/AppAssets";
import AllCategories from "./pages/app_categories/AllCategories";
import TutorShowBothChatAndJoinedStudents from "./pages/Courses/Coures/TutorShowBothChatAndJoinedStudents";
import ShareLiveClassMonitor from "./pages/Courses/Coures/ShareUrl";
import AllTestSeriesBundle from "./pages/TestSeries/Bundle/AllTestSeriesBundle";
import CreateTestSeriesBundle from "./pages/TestSeries/Bundle/CreateTestSeriesBundle";
import EditTestSeriesBundle from "./pages/TestSeries/Bundle/EditTestSeriesBundle";
import AllQuizBundle from "./pages/Quiz/Bundle/AllQuizBundle";
import CreateQuizBundle from "./pages/Quiz/Bundle/CreateQuizBundle";
import EditQuizBundle from "./pages/Quiz/Bundle/EditQuizBundle";
import Transactions from "./pages/Payments/transactions";
import Coupons from "./pages/Payments/coupons";
import AllPlayList from "./pages/free-videos/AllPlayList";
import AllStudyMaterialsCategories from "./pages/StudyMaterial/AllStudyMaterialsCateories";
import AllStudyMaterials from "./pages/StudyMaterial/AllStudyMaterials";
import AllStudyMaterialPurchaseHistory from "./pages/StudyMaterial/AllStudyMaterialPurchaseHistory";
import AssignStudyMaterial from "./pages/StudyMaterial/AssignStudyMaterial";
import BatchSubjectAssign from "./pages/Assigns/BatchSubjectAssign";
import AssignQuiz from "./pages/Assigns/AssignQuiz";
import AssignTestSeries from "./pages/Assigns/AssignTestSeries";
import DikshantAdmin from "./pages/NewTest/DikshantAdmin";
import TestSeriesPage from "./pages/NewTest/Testseriespage";
import TestsPage from "./pages/NewTest/TestPages";
import QuestionsPage from "./pages/NewTest/QuestionTestSeries";
import CheckSubmission from "./pages/NewTest/CheckSubmission";
export default function App() {
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
              {/* Test series Bundle */}
              <Route
                path="/all-test-series-bundle"
                element={<AllTestSeriesBundle />}
              />
              <Route
                path="/create-test-series-bundle"
                element={<CreateTestSeriesBundle />}
              />
              <Route
                path="/edit-test-series-bundle/:id"
                element={<EditTestSeriesBundle />}
              />
              <Route path="/all-quiz-bundles" element={<AllQuizBundle />} />
              <Route
                path="/create-quiz-bundle"
                element={<CreateQuizBundle />}
              />
              <Route
                path="/edit-quiz-bundle/:id"
                element={<EditQuizBundle />}
              />
              {/* scholarship-apply */}
              <Route path="/scholarship-apply" element={<ScholarshipApply />} />
              <Route path="/scholarship" element={<Scholarship />} />
              {/* end-notification */}
              <Route path="/send-notification" element={<SendNotification />} />
              {/* Subjects */}
              <Route path="/all-subject" element={<AllSubject />} />
              <Route path="/all-faqs" element={<FAQPage />} />
              <Route path="/all-doubts" element={<DoubtsAdmin />} />
              {/* Announcements */}
              <Route path="/announcements" element={<Announcements />} />
              {/* Banners */}
              <Route path="/app-baners" element={<Banner />} />
              {/* settings */}
              <Route path="/setting" element={<Settings />} />
              {/* Pdf */}
              <Route path="/upload-pdf" element={<Uploadpdf />} />
              {/* Test Series */}
              <Route path="/all-test-series" element={<AllTestSeries />} />
              <Route path="/testseries/:id" element={<ViewTestSeries />} />
              <Route
                path="/admin/testseries/edit/:id"
                element={<EditTestSeries />}
              />
              <Route
                path="/admin/testseries/new"
                element={<CreateTestSeries />}
              />
              <Route
                path="admin/testseries/submissions/:id"
                element={<ViewSubmission />}
              />
              <Route
                path="admin/testseries/purchases/:id"
                element={<ViewPurchase />}
              />
              <Route path="admin/testseries/result/:id" element={<Result />} />
              <Route path="/all-attemps" element={<AllAtempts />} />
              <Route
                path="/admin/quiz-attempts/:id/result"
                element={<ResultQuiz />}
              />
              <Route path="/app-assets" element={<AppAssets />} />
              <Route path="/app-Categories" element={<AllCategories />} />
              {/* admin/testseries/purchases */}
              {/* Quizes */}
              <Route path="/all-quizzes" element={<AllQuizzesPage />} />
              <Route path="/create-quizzes" element={<CreateQuiz />} />
              <Route
                path="/create-questions/:quizId"
                element={<CreateQuestions />}
              />

              <Route path="/new-admin" element={<TestSeriesPage />} />
              <Route path="/new-questions" element={<QuestionsPage />} />

              <Route path="/new-testsPage" element={<TestsPage />} />
              <Route path="/check-submission/:id" element={<CheckSubmission />} />







              <Route
                path="/view-studnets-joined/:id"
                element={<StudnetsJoined />}
              />
              <Route path="/view-chat/:id" element={<StudentChats />} />
              <Route
                path="/view-comments-joined/:id"
                element={<ViewComments />}
              />

              <Route path="/payments/transactions" element={<Transactions />} />
              <Route path="/payments/coupons" element={<Coupons />} />
              {/* Free v\videos */}

              <Route path="/free-videos" element={<AllPlayList />} />

              <Route path="/all-study-material-categories" element={<AllStudyMaterialsCategories />} />
              <Route path="/all-study-material" element={<AllStudyMaterials />} />
              <Route path="/all-test-series-purchase" element={<AllStudyMaterialPurchaseHistory />} />
              <Route path="/assign-material" element={<AssignStudyMaterial />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />


              {/* Admin Assigns */}
              <Route path="/admin/users/:id/assign-subject" element={<BatchSubjectAssign />} />
              <Route path="/admin/users/:id/assign-quiz" element={<AssignQuiz />} />
              <Route path="/admin/users/:id/assign-testseries" element={<AssignTestSeries />} />



            </Route>
          </Route>

          {/* 🔓 PUBLIC ROUTES */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/live-class-monitor/:id"
            element={<ShareLiveClassMonitor />}
          />
          <Route
            path="/stats-of-class/:id"
            element={<TutorShowBothChatAndJoinedStudents />}
          />

          {/* ❌ NOT FOUND */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            zIndex: 999999999999,
          },
        }}
      />
    </>
  );
}
