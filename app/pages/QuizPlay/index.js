import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Alert,
    BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // ← YE ADD KARNA
import QuizHeader from './components/QuizHeader';
import QuestionCard from './components/QuestionCard';
import OptionsList from './components/OptionsList';
import SubmitButton from './components/SubmitButton';
import { useQuizStore } from '../../stores/useQuizStore';

export default function QuizPlay({ route, navigation }) {
    const { quizId } = route.params;

    const {
        fetchQuiz,
        quiz,
        questions,
        currentQuestionIndex,
        loading,
        error,
        timeRemaining,
        startQuiz,
        fetchNextQuestion,
        selectedAnswers,
        isLastQuestion,
        submitQuiz,
        reset,
        attemptId, // ← IMPORTANT: Resume ke liye chahiye
    } = useQuizStore();
    // Back Press Handler
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                Alert.alert(
                    "Quit Quiz?",
                    "Your progress is saved automatically.\nYou can resume this quiz later from where you left off.",
                    [
                        {
                            text: "Stay Here",
                            style: "cancel",
                        },
                        {
                            text: "Quit & Resume Later",
                            style: "destructive",
                            onPress: () => {
                                navigation.goBack(); // Safe exit
                            },
                        },
                    ],
                    { cancelable: false }
                );
                return true; // Prevent default back action
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [navigation])
    );

    useEffect(() => {
        startQuiz(quizId, (info) => {
            if (info.isFirstAttempt) {
                navigation.replace('FirstAttemptMotivation');
            }
        });

        fetchQuiz(quizId);

        return () => {
            // Screen leave hone par cleanup (optional, kyunki back press already handled)
            // reset(); ← NAHI KARNA! Kyunki resume chahiye
        };
    }, [quizId, navigation]);

    // Loading
    if (loading && !quiz) {
        return (
            <View style={styles.centerScreen}>
                <ActivityIndicator size="large" color="#B11226" />
                <Text style={styles.loadingText}>Loading your quiz...</Text>
            </View>
        );
    }

    // Error
    if (error) {
        return (
            <View style={styles.centerScreen}>
                <Ionicons name="alert-circle-outline" size={80} color="#DC2626" />
                <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                <Text style={styles.errorMessage}>{error}</Text>

                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        reset();
                        startQuiz(quizId);
                    }}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!quiz || questions.length === 0 || !questions[currentQuestionIndex]) {
        return (
            <View style={styles.centerScreen}>
                <Text>No questions available</Text>
            </View>
        );
    }


    const currentQuestion = questions[currentQuestionIndex];
    const selectedId = selectedAnswers[currentQuestion.id] || null;
    return (
        <View style={styles.container}>
            <QuizHeader
                quiz={quiz}
                currentIndex={currentQuestionIndex}
                totalQuestions={quiz.totalQuestions}
                timeRemaining={timeRemaining}
            />

            <QuestionCard question={currentQuestion} />

            <OptionsList
                options={currentQuestion.options}
                selectedId={selectedId}
                onSelect={(optionId) => {
                    useQuizStore.getState().selectAnswer(currentQuestion.id, optionId); // local update
                    fetchNextQuestion(optionId); // backend save + next question
                }}
            />

            {isLastQuestion && (
                <SubmitButton
                    onPress={() => {
                        Alert.alert(
                            "Submit Quiz?",
                            "Once submitted, you cannot change your answers.\nAre you sure?",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Submit Now",
                                    onPress: () => {
                                        submitQuiz((result) => {
                                            navigation.replace('QuizResult', {
                                                attemptId: useQuizStore.getState().attemptId,
                                                ...result,
                                            });
                                        });
                                    },
                                },
                            ]
                        );
                    }}
                    disabled={loading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#4B5563',
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginTop: 20,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
        marginHorizontal: 30,
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: '#B11226',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        marginTop: 30,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        marginTop: 16,
        padding: 10,
    },
    backText: {
        color: '#B11226',
        fontSize: 16,
        fontWeight: '600',
    },
});