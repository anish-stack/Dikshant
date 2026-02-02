import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const colors = {
    primary: "#FF0000",
    secondary: "#000000",
    white: "#FFFFFF",
    lightGray: "#F5F5F5",
    darkGray: "#333333",
    border: "#E0E0E0",
    success: "#28A745",
    danger: "#DC3545",
};

// Sample questions for each category
const questionsData = {
    1: [ // Civil Services
        {
            id: 1,
            question: "Who was the first President of India?",
            options: ["Dr. Rajendra Prasad", "Dr. S. Radhakrishnan", "Jawaharlal Nehru", "Sardar Patel"],
            correctAnswer: 0,
        },
        {
            id: 2,
            question: "In which year was the Indian Constitution adopted?",
            options: ["1947", "1948", "1949", "1950"],
            correctAnswer: 2,
        },
        {
            id: 3,
            question: "Which Article of the Constitution deals with Right to Education?",
            options: ["Article 19", "Article 21", "Article 21A", "Article 32"],
            correctAnswer: 2,
        },
        {
            id: 4,
            question: "Who is known as the 'Father of the Indian Constitution'?",
            options: ["Mahatma Gandhi", "B.R. Ambedkar", "Jawaharlal Nehru", "Sardar Patel"],
            correctAnswer: 1,
        },
        {
            id: 5,
            question: "How many fundamental rights are there in the Indian Constitution?",
            options: ["5", "6", "7", "8"],
            correctAnswer: 1,
        },
        {
            id: 6,
            question: "Which is the highest civilian award in India?",
            options: ["Padma Bhushan", "Padma Vibhushan", "Bharat Ratna", "Padma Shri"],
            correctAnswer: 2,
        },
        {
            id: 7,
            question: "The term of Lok Sabha is:",
            options: ["4 years", "5 years", "6 years", "7 years"],
            correctAnswer: 1,
        },
        {
            id: 8,
            question: "Who appoints the Chief Justice of India?",
            options: ["Prime Minister", "President", "Law Minister", "Parliament"],
            correctAnswer: 1,
        },
        {
            id: 9,
            question: "Which Schedule of Constitution deals with anti-defection law?",
            options: ["8th Schedule", "9th Schedule", "10th Schedule", "11th Schedule"],
            correctAnswer: 2,
        },
        {
            id: 10,
            question: "The Preamble of Indian Constitution was amended in which year?",
            options: ["1971", "1975", "1976", "1977"],
            correctAnswer: 2,
        },
    ],
    2: [ // Banking
        {
            id: 1,
            question: "What is the full form of NEFT?",
            options: ["National Electronic Fund Transfer", "National E-Fund Transfer", "New Electronic Fund Transfer", "National Easy Fund Transfer"],
            correctAnswer: 0,
        },
        {
            id: 2,
            question: "What is the current repo rate in India (approx)?",
            options: ["5.5%", "6.0%", "6.5%", "7.0%"],
            correctAnswer: 2,
        },
        {
            id: 3,
            question: "Which organization regulates banking in India?",
            options: ["SEBI", "RBI", "IRDAI", "NABARD"],
            correctAnswer: 1,
        },
        {
            id: 4,
            question: "What is the minimum amount for RTGS transaction?",
            options: ["₹1 lakh", "₹2 lakhs", "₹5 lakhs", "No minimum limit"],
            correctAnswer: 3,
        },
        {
            id: 5,
            question: "Who is the current Governor of RBI?",
            options: ["Urjit Patel", "Raghuram Rajan", "Shaktikanta Das", "Y.V. Reddy"],
            correctAnswer: 2,
        },
        {
            id: 6,
            question: "Basel norms are related to:",
            options: ["Banking regulation", "Trade policy", "Tax system", "Insurance"],
            correctAnswer: 0,
        },
        {
            id: 7,
            question: "What is the full form of CRR?",
            options: ["Cash Reserve Ratio", "Credit Reserve Ratio", "Current Reserve Ratio", "Commercial Reserve Ratio"],
            correctAnswer: 0,
        },
        {
            id: 8,
            question: "IMPS stands for:",
            options: ["Immediate Payment Service", "Instant Money Payment Service", "Indian Mobile Payment System", "None of these"],
            correctAnswer: 0,
        },
        {
            id: 9,
            question: "Which bank is known as 'Banker's Bank'?",
            options: ["SBI", "ICICI", "RBI", "HDFC"],
            correctAnswer: 2,
        },
        {
            id: 10,
            question: "The headquarter of RBI is located in:",
            options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"],
            correctAnswer: 1,
        },
    ],
    3: [ // Railway
        {
            id: 1,
            question: "What is the full form of RRB?",
            options: ["Railway Recruitment Board", "Railway Reservation Board", "Regional Railway Board", "Railway Review Board"],
            correctAnswer: 0,
        },
        {
            id: 2,
            question: "In which year were Indian Railways established?",
            options: ["1853", "1858", "1865", "1875"],
            correctAnswer: 0,
        },
        {
            id: 3,
            question: "What is the maximum speed of Vande Bharat Express?",
            options: ["160 km/h", "180 km/h", "200 km/h", "220 km/h"],
            correctAnswer: 1,
        },
        {
            id: 4,
            question: "How many railway zones are there in India?",
            options: ["16", "17", "18", "19"],
            correctAnswer: 1,
        },
        {
            id: 5,
            question: "Which is the longest railway tunnel in India?",
            options: ["Pir Panjal", "Konkan", "Rohtang", "Natuwadi"],
            correctAnswer: 0,
        },
        {
            id: 6,
            question: "Indian Railway headquarters is located in:",
            options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"],
            correctAnswer: 1,
        },
        {
            id: 7,
            question: "What is the gauge size of broad gauge?",
            options: ["1000 mm", "1435 mm", "1676 mm", "2000 mm"],
            correctAnswer: 2,
        },
        {
            id: 8,
            question: "First electric train in India ran between:",
            options: ["Mumbai-Pune", "Delhi-Agra", "Bombay-Kurla", "Chennai-Bangalore"],
            correctAnswer: 2,
        },
        {
            id: 9,
            question: "Which railway station has the longest platform?",
            options: ["Gorakhpur", "Kharagpur", "Howrah", "New Delhi"],
            correctAnswer: 0,
        },
        {
            id: 10,
            question: "Indian Railways is the world's _____ largest railway network:",
            options: ["2nd", "3rd", "4th", "5th"],
            correctAnswer: 2,
        },
    ],
    4: [ // State Services
        {
            id: 1,
            question: "State PSC exams are conducted for:",
            options: ["Central services", "State services", "Both", "None"],
            correctAnswer: 1,
        },
        {
            id: 2,
            question: "Who appoints the State Public Service Commission members?",
            options: ["Prime Minister", "Governor", "Chief Minister", "President"],
            correctAnswer: 1,
        },
        {
            id: 3,
            question: "The term of SPSC members is:",
            options: ["4 years", "5 years", "6 years", "Until 62 years"],
            correctAnswer: 3,
        },
        {
            id: 4,
            question: "Which Article deals with State PSC?",
            options: ["Article 315", "Article 320", "Article 323", "Article 330"],
            correctAnswer: 0,
        },
        {
            id: 5,
            question: "State services include:",
            options: ["IAS", "IPS", "State Police", "IFS"],
            correctAnswer: 2,
        },
        {
            id: 6,
            question: "The Chairman of SPSC is appointed by:",
            options: ["President", "Governor", "Chief Minister", "Chief Justice"],
            correctAnswer: 1,
        },
        {
            id: 7,
            question: "How many members can be in SPSC?",
            options: ["Determined by Governor", "Fixed at 10", "Fixed at 15", "Unlimited"],
            correctAnswer: 0,
        },
        {
            id: 8,
            question: "SPSC advises on matters relating to:",
            options: ["Recruitment", "Promotions", "Disciplinary matters", "All of these"],
            correctAnswer: 3,
        },
        {
            id: 9,
            question: "The removal of SPSC member requires:",
            options: ["Governor order", "President order", "Supreme Court order", "Parliament resolution"],
            correctAnswer: 1,
        },
        {
            id: 10,
            question: "SPSC submits annual report to:",
            options: ["President", "Governor", "Chief Minister", "Parliament"],
            correctAnswer: 1,
        },
    ],
    5: [ // Defence
        {
            id: 1,
            question: "What is the full form of NDA?",
            options: ["National Defence Academy", "National Development Authority", "New Defence Act", "National Defence Association"],
            correctAnswer: 0,
        },
        {
            id: 2,
            question: "NDA is located in:",
            options: ["Dehradun", "Pune", "Bangalore", "Secunderabad"],
            correctAnswer: 1,
        },
        {
            id: 3,
            question: "Who is the Supreme Commander of Indian Armed Forces?",
            options: ["Prime Minister", "Defence Minister", "President", "Army Chief"],
            correctAnswer: 2,
        },
        {
            id: 4,
            question: "Indian Military Academy is located in:",
            options: ["Dehradun", "Pune", "Secunderabad", "Bangalore"],
            correctAnswer: 0,
        },
        {
            id: 5,
            question: "What is the motto of Indian Army?",
            options: ["Service Before Self", "Seva Paramo Dharma", "Duty, Honor, Country", "Nation First"],
            correctAnswer: 1,
        },
        {
            id: 6,
            question: "CDS exam is conducted by:",
            options: ["NDA", "UPSC", "SSB", "MOD"],
            correctAnswer: 1,
        },
        {
            id: 7,
            question: "Indian Air Force Day is celebrated on:",
            options: ["October 8", "November 15", "December 4", "January 15"],
            correctAnswer: 0,
        },
        {
            id: 8,
            question: "The rank of Field Marshal in Indian Army is:",
            options: ["Active rank", "Honorary rank", "Temporary rank", "None"],
            correctAnswer: 1,
        },
        {
            id: 9,
            question: "AFCAT is conducted for:",
            options: ["Army", "Navy", "Air Force", "Coast Guard"],
            correctAnswer: 2,
        },
        {
            id: 10,
            question: "Indian Navy Day is observed on:",
            options: ["December 4", "October 21", "August 15", "November 19"],
            correctAnswer: 0,
        },
    ],
    6: [ // Police
        {
            id: 1,
            question: "Police comes under which list?",
            options: ["Union List", "State List", "Concurrent List", "None"],
            correctAnswer: 1,
        },
        {
            id: 2,
            question: "What is the full form of IPC?",
            options: ["Indian Penal Code", "Indian Police Code", "Indian Protection Code", "Indian Punishment Code"],
            correctAnswer: 0,
        },
        {
            id: 3,
            question: "SSC CPO exam is for:",
            options: ["State Police", "Central Armed Police", "Traffic Police", "Railway Police"],
            correctAnswer: 1,
        },
        {
            id: 4,
            question: "Which force is responsible for border security?",
            options: ["CRPF", "BSF", "CISF", "ITBP"],
            correctAnswer: 1,
        },
        {
            id: 5,
            question: "The rank hierarchy starts with:",
            options: ["Constable", "Head Constable", "Sub Inspector", "Inspector"],
            correctAnswer: 0,
        },
        {
            id: 6,
            question: "CrPC stands for:",
            options: ["Criminal Procedure Code", "Crime Prevention Code", "Criminal Protection Code", "Central Police Code"],
            correctAnswer: 0,
        },
        {
            id: 7,
            question: "National Police Academy is located in:",
            options: ["Delhi", "Hyderabad", "Mumbai", "Bangalore"],
            correctAnswer: 1,
        },
        {
            id: 8,
            question: "CRPF headquarters is in:",
            options: ["Mumbai", "Delhi", "Kolkata", "Chennai"],
            correctAnswer: 1,
        },
        {
            id: 9,
            question: "Which Article deals with police powers?",
            options: ["Article 355", "Article 360", "Article 365", "Article 370"],
            correctAnswer: 0,
        },
        {
            id: 10,
            question: "FIR stands for:",
            options: ["First Information Report", "First Investigation Report", "Final Information Report", "First Inquiry Report"],
            correctAnswer: 0,
        },
    ],
};

const QuesAndScreen = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { categoryId } = route.params || {}
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(20);
    const [quizFinished, setQuizFinished] = useState(false);

    const questions = questionsData[categoryId] || [];

    useEffect(() => {
        if (quizFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleNext();
                    return 20;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentQuestion, quizFinished]);

    const handleSelectAnswer = (answerIndex) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestion]: answerIndex,
        });
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setTimeLeft(20);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setQuizFinished(true);
    };
    const handleFinishQuiz = () => {
        navigation.goBack()
    };


    const calculateResults = () => {
        let correct = 0;
        let wrong = 0;
        let unattempted = 0;
        let totalMarks = 0;

        questions.forEach((question, index) => {
            const userAnswer = selectedAnswers[index];
            if (userAnswer === undefined) {
                unattempted++;
            } else if (userAnswer === question.correctAnswer) {
                correct++;
                totalMarks += 4;
            } else {
                wrong++;
                totalMarks -= 1;
            }
        });

        return { correct, wrong, unattempted, totalMarks };
    };

    if (quizFinished) {
        const results = calculateResults();
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>Quiz Completed! 🎉</Text>

                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreTitle}>Your Score</Text>
                        <Text style={styles.scoreValue}>{results.totalMarks}</Text>
                        <Text style={styles.scoreSubtitle}>out of {questions.length * 4}</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.success }]}>
                                {results.correct}
                            </Text>
                            <Text style={styles.statLabel}>Correct</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.danger }]}>
                                {results.wrong}
                            </Text>
                            <Text style={styles.statLabel}>Wrong</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.darkGray }]}>
                                {results.unattempted}
                            </Text>
                            <Text style={styles.statLabel}>Unattempted</Text>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ✓ Correct answer: +4 marks
                        </Text>
                        <Text style={styles.infoText}>
                            ✗ Wrong answer: -1 mark
                        </Text>
                        <Text style={styles.infoText}>
                            ○ Unattempted: 0 marks
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => handleFinishQuiz()}
                    >
                        <Text style={styles.primaryButtonText}>Back to Categories</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const question = questions[currentQuestion];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.quizHeader}>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        Question {currentQuestion + 1}/{questions.length}
                    </Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${((currentQuestion + 1) / questions.length) * 100}%` },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{timeLeft}s</Text>
                </View>
            </View>

            <ScrollView style={styles.questionContainer}>
                <Text style={styles.questionText}>{question.question}</Text>

                <View style={styles.optionsContainer}>
                    {question.options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.optionButton,
                                selectedAnswers[currentQuestion] === index &&
                                styles.optionButtonSelected,
                            ]}
                            onPress={() => handleSelectAnswer(index)}
                        >
                            <View style={styles.optionNumber}>
                                <Text style={[
                                    styles.optionNumberText,
                                    selectedAnswers[currentQuestion] === index &&
                                    styles.optionNumberTextSelected,
                                ]}>
                                    {String.fromCharCode(65 + index)}
                                </Text>
                            </View>
                            <Text style={[
                                styles.optionText,
                                selectedAnswers[currentQuestion] === index &&
                                styles.optionTextSelected,
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        selectedAnswers[currentQuestion] === undefined &&
                        styles.nextButtonDisabled,
                    ]}
                    onPress={handleNext}
                    disabled={selectedAnswers[currentQuestion] === undefined}
                >
                    <Text style={styles.nextButtonText}>
                        {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    quizHeader: {
        backgroundColor: colors.white,
        padding: 20,
        paddingTop: 40,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    progressContainer: {
        marginBottom: 15,
    },
    progressText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.secondary,
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.lightGray,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    timerContainer: {
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        padding: 10,
        borderRadius: 8,
    },
    timerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    questionContainer: {
        flex: 1,
        padding: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 25,
        lineHeight: 26,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        padding: 15,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
    },
    optionButtonSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    optionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionNumberText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    optionNumberTextSelected: {
        color: colors.primary,
    },
    optionText: {
        flex: 1,
        fontSize: 16,
        color: colors.secondary,
    },
    optionTextSelected: {
        color: colors.white,
        fontWeight: '600',
    },
    buttonContainer: {
        padding: 20,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    nextButton: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: colors.darkGray,
        opacity: 0.5,
    },
    nextButtonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.secondary,
        marginBottom: 30,
        textAlign: 'center',
    },
    scoreCard: {
        backgroundColor: colors.primary,
        width: width - 80,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 30,
        elevation: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    scoreTitle: {
        fontSize: 18,
        color: colors.white,
        marginBottom: 10,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: 'bold',
        color: colors.white,
    },
    scoreSubtitle: {
        fontSize: 16,
        color: colors.white,
        opacity: 0.9,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: colors.darkGray,
    },
    infoBox: {
        backgroundColor: colors.lightGray,
        padding: 20,
        borderRadius: 12,
        width: '100%',
        marginBottom: 30,
    },
    infoText: {
        fontSize: 14,
        color: colors.darkGray,
        marginBottom: 8,
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 10,
        width: '100%',
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default QuesAndScreen;