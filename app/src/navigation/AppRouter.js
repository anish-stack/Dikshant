import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

/* Screens */
import Splash from "../../screens/splash/splash";
import Login from "../../screens/auth/Login";
import Signup from "../../screens/auth/Signup";
import Home from "../../pages/Home/Home";
import CourseDetail from "../../screens/courses/CourseDetail";
import CoursePage from "../../screens/courses/CoursePage";
import EnrollCourse from "../../screens/courses/EnrollCourse";
import MyEnrollCourse from "../../pages/Profile/MyEnrollCourse";
import CourseSubjectEnrolled from "../../pages/Profile/CourseSubjectEnrolled";

import ForgotPassword from "../../screens/auth/ForgotPassword";
import ViewAllVideos from "../../pages/CourseComponets/ViewAllVideos";
import PlayerScreen from "../../screens/PlayerScreen/PlayerScreen";

import Profile from "../../pages/Profile/Profile";
import MyCourses from "../../pages/Profile/MyCourses";
import MyAllQuiz from "../../pages/Profile/MyAllQuiz";
import AllAtemptsQuiz from "../../pages/Profile/AllAtemptsQuiz";
import follow from "../../pages/Profile/follow";

import EBooks from "../../pages/Books/EBooks";
import Downloads from "../../pages/Downloads/Downloads";
import RecordedCourses from "../../pages/RecordedCourses/RecordedCourses";

import TestScreen from "../../screens/Tests/Tests";
import QuesAndScreen from "../../screens/Tests/QuesAndScreen";

import IntroQuiz from "../../pages/Quiz/IntroQuiz";
import AllQuizes from "../../pages/Quiz/AllQuizes";
import QuizDetails from "../../pages/Quiz/QuizDetails";
import QuizPlay from "../../pages/QuizPlay";
import QuizResult from "../../pages/QuizPlay/components/QuizResult";

import TestSeries from "../../pages/TestSeries/TestSeries";
import IntroTestSeries from "../../pages/TestSeries/IntroTestSeries";
import TestSeriesView from "../../pages/TestSeries/TestSeriesView";
import ResultScreen from "../../pages/TestSeries/ResultScreen";

import Scholarship from "../../pages/Scholarship/AllScholarship";
import ApplyScholarship from "../../pages/Scholarship/ApplyScholarship";

import PdfNotesScreen from "../../pages/CourseComponets/PdfNotesScreen";
import AnnouncementDetails from "../../components/AnnouncementDetails";

import {
  HelpSupportScreen,
  RateUsScreen,
  ShareAppScreen,
} from "../../pages/Profile/ShareApp";

import { Settings } from "../../screens/Others/Settings";
import { HelpSupport } from "../../screens/Others/HelpSupport";
import { About } from "../../screens/Others/About";
import Notifications from "../../screens/Others/Notifications";
import PermissionsScreen from "../../screens/Others/PermissionsScreen";

const Stack = createNativeStackNavigator();

export default function AppRouter({ navigationRef }) {
  const linking = {
    prefixes: ["http://192.168.1.22:5174"],
    config: {
      screens: {
        Home: "app/open-home",
        MyEnrollCourse: "app/my-enroll",
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style="auto" />

      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* Auth */}
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />

        {/* Home */}
        <Stack.Screen name="Home" component={Home} />

        {/* Courses */}
        <Stack.Screen name="CourseDetail" component={CourseDetail} />
        <Stack.Screen name="Courses" component={CoursePage} />
        <Stack.Screen name="enroll-course" component={EnrollCourse} />
        <Stack.Screen name="my-course" component={MyEnrollCourse} />
        <Stack.Screen
          name="my-course-subjects"
          component={CourseSubjectEnrolled}
        />

        {/* Player */}
        <Stack.Screen name="view-all-videos" component={ViewAllVideos} />
        <Stack.Screen name="PlayerScreen" component={PlayerScreen} />

        {/* Profile */}
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="all-my-course" component={MyCourses} />
        <Stack.Screen name="all-my-quiz" component={MyAllQuiz} />
        <Stack.Screen name="AllQuizAttempts" component={AllAtemptsQuiz} />
        <Stack.Screen name="follow" component={follow} />

        {/* Content */}
        <Stack.Screen name="EBooks" component={EBooks} />
        <Stack.Screen name="Downloads" component={Downloads} />
        <Stack.Screen name="RecordedCourses" component={RecordedCourses} />

        {/* Quiz */}
        <Stack.Screen name="Quiz" component={TestScreen} />
        <Stack.Screen name="startQuz" component={QuesAndScreen} />
        <Stack.Screen name="Quiz-Intro" component={IntroQuiz} />
        <Stack.Screen name="AllQuizes" component={AllQuizes} />
        <Stack.Screen name="QuizDetails" component={QuizDetails} />
        <Stack.Screen name="QuizPlay" component={QuizPlay} />
        <Stack.Screen name="QuizResult" component={QuizResult} />

        {/* Test Series */}
        <Stack.Screen name="TestSeries" component={TestSeries} />
        <Stack.Screen name="IntroTestSeries" component={IntroTestSeries} />
        <Stack.Screen name="testseries-view" component={TestSeriesView} />
        <Stack.Screen name="ResultScreen" component={ResultScreen} />

        {/* Others */}
        <Stack.Screen name="PdfNotes" component={PdfNotesScreen} />
        <Stack.Screen name="annouce-details" component={AnnouncementDetails} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Support" component={HelpSupport} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Permissions" component={PermissionsScreen} />

        {/* Scholarship */}
        <Stack.Screen name="apply-sch" component={Scholarship} />
        <Stack.Screen name="ApplyScholarship" component={ApplyScholarship} />

        {/* Share */}
        <Stack.Screen name="ShareApp" component={ShareAppScreen} />
        <Stack.Screen name="RateUs" component={RateUsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
