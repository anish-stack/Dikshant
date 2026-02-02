import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    Alert,
} from 'react-native';
import Layout from '../../components/layout';


const colors = {
    primary: '#FF3B30',
    secondary: '#1C2526',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    darkGray: '#495057',
    border: '#DEE2E6',
    success: '#28A745',
    danger: '#DC3545',

    // Solid card background colors (one per category)
    card1: '#FF6B6B',
    card2: '#4ECDC4',
    card3: '#5C7AEA',
    card4: '#FFD93D',
    card5: '#6C5CE7',
    card6: '#74B9FF',
};

const quizCategories = [
    {
        id: 1,
        title: 'Civil Services',
        description: 'UPSC, IAS, IPS Preparation',
        totalQuestions: 10,
        isFree: true,
        icon: '📚',
        bgColor: colors.card1,
    },
    {
        id: 2,
        title: 'Banking Exams',
        description: 'IBPS, SBI, RBI Preparation',
        totalQuestions: 10,
        isFree: false,
        price: '₹199',
        icon: '🏦',
        bgColor: colors.card2,
    },
    {
        id: 3,
        title: 'Railway Exams',
        description: 'RRB, NTPC, Group D',
        totalQuestions: 10,
        isFree: true,
        icon: '🚂',
        bgColor: colors.card3,
    },
    {
        id: 4,
        title: 'State Services',
        description: 'State PSC Exams',
        totalQuestions: 10,
        isFree: false,
        price: '₹149',
        icon: '🏛️',
        bgColor: colors.card4,
    },
    {
        id: 5,
        title: 'Defence Exams',
        description: 'NDA, CDS, AFCAT',
        totalQuestions: 10,
        isFree: true,
        icon: '⚔️',
        bgColor: colors.card5,
    },
    {
        id: 6,
        title: 'Police Exams',
        description: 'State Police, SSC CPO',
        totalQuestions: 10,
        isFree: false,
        price: '₹99',
        icon: '👮',
        bgColor: colors.card6,
    },
];

const TestScreen = () => {
    const navigation = useNavigation();

    return (
        <Layout>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <ImageBackground
                    source={{
                        uri: 'https://www.dikshantias.com/_next/image?url=%2Fimg%2Fabout-us-hero.webp&w=3840&q=75',
                    }}
                    style={styles.hero}
                    imageStyle={styles.heroImage}
                >
                    <View style={styles.overlay}>
                        <Text style={styles.heroTitle}>Master Your Exams</Text>
                        <Text style={styles.heroSubtitle}>
                            Practice with 1000+ real exam questions
                        </Text>
                        <Text style={styles.heroTagline}>Start Your Journey to Success!</Text>
                    </View>
                </ImageBackground>

                {/* Quiz Cards */}
                <View style={styles.cardsContainer}>
                    {quizCategories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={styles.cardWrapper}
                            onPress={() => {
                                if (!category.isFree) {
                                    Alert.alert(
                                        'Premium Quiz Locked',
                                        `Unlock this quiz for only ${category.price}\nGet full access with Premium!`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Subscribe Now', onPress: () => console.log('Subscribe') },
                                        ]
                                    );
                                } else {
                                    navigation.navigate('startQuz', { categoryId: category.id });
                                }
                            }}
                            activeOpacity={0.85}
                        >
                            {/* Solid Color Card */}
                            <View style={[styles.card, { backgroundColor: category.bgColor }]}>
                                <View style={styles.cardContent}>
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.icon}>{category.icon}</Text>
                                    </View>

                                    <View style={styles.textContent}>
                                        <Text style={styles.cardTitle}>{category.title}</Text>
                                        <Text style={styles.cardDescription}>{category.description}</Text>
                                        <Text style={styles.questionCount}>
                                            {category.totalQuestions} Questions
                                        </Text>
                                    </View>

                                    <View style={styles.actionArea}>
                                        {category.isFree ? (
                                            <View style={styles.freeBadge}>
                                                <Text style={styles.freeText}>FREE</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.priceBadge}>
                                                <Text style={styles.priceText}>{category.price}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.startText}>Start →</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Motivational Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        “Success is not final, failure is not fatal: It is the courage to continue that counts.”
                    </Text>
                    <Text style={styles.footerAuthor}>— Winston Churchill</Text>
                </View>
            </ScrollView>
        </Layout>
    );
};

export default TestScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    hero: {
        // height: 220,
        marginBottom: 20,
        justifyContent: 'flex-end',
    },

    overlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 4,
    },
    heroTagline: {
        fontSize: 18,
        color: '#FFD700',
        fontWeight: '600',
    },
    cardsContainer: {
        paddingHorizontal: 16,
    },
    cardWrapper: {
        marginBottom: 16,
        borderRadius: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    card: {
        borderRadius: 16,
        padding: 18,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    icon: {
        fontSize: 28,
    },
    textContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 6,
    },
    questionCount: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    actionArea: {
        alignItems: 'flex-end',
    },
    freeBadge: {
        backgroundColor: '#28A745',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
    },
    freeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    priceBadge: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
    },
    priceText: {
        color: '#FF3B30',
        fontSize: 11,
        fontWeight: 'bold',
    },
    startText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    footer: {
        padding: 24,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    footerText: {
        fontSize: 15,
        color: '#6C757D',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 22,
    },
    footerAuthor: {
        fontSize: 13,
        color: '#ADB5BD',
        marginTop: 8,
        fontWeight: '600',
    },
});