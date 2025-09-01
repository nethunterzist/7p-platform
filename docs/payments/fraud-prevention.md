# Fraud Prevention System Guide

## Overview

Comprehensive fraud detection and prevention system for 7P Education Platform, utilizing machine learning, real-time monitoring, behavioral analysis, and multi-layered security measures to protect against payment fraud and maintain transaction integrity.

## Core Architecture

### Fraud Detection Components

```typescript
interface IFraudRule {
  id: string;
  name: string;
  description: string;
  category: FraudCategory;
  ruleType: RuleType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  conditions: FraudCondition[];
  actions: FraudAction[];
  thresholds: RuleThreshold[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    accuracy: number;
    falsePositiveRate: number;
    version: string;
  };
}

enum FraudCategory {
  PAYMENT_CARD = 'payment_card',
  ACCOUNT_TAKEOVER = 'account_takeover',
  IDENTITY_THEFT = 'identity_theft',
  VELOCITY_ABUSE = 'velocity_abuse',
  GEOGRAPHIC_ANOMALY = 'geographic_anomaly',
  DEVICE_SPOOFING = 'device_spoofing',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  SYNTHETIC_IDENTITY = 'synthetic_identity'
}

enum RuleType {
  THRESHOLD_BASED = 'threshold_based',
  ML_BASED = 'ml_based',
  PATTERN_MATCHING = 'pattern_matching',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
  RISK_SCORING = 'risk_scoring',
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist'
}

interface IFraudEvent {
  id: string;
  transactionId: string;
  userId: string;
  eventType: FraudEventType;
  riskScore: number;
  ruleTriggered: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: FraudEventStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  evidence: FraudEvidence;
  investigationNotes: string[];
  falsePositive: boolean;
  metadata: {
    ipAddress: string;
    deviceFingerprint: string;
    userAgent: string;
    geolocation: GeoLocation;
    sessionId: string;
  };
}

enum FraudEventType {
  SUSPICIOUS_PAYMENT = 'suspicious_payment',
  ACCOUNT_COMPROMISE = 'account_compromise',
  CARD_TESTING = 'card_testing',
  VELOCITY_VIOLATION = 'velocity_violation',
  GEOGRAPHIC_INCONSISTENCY = 'geographic_inconsistency',
  DEVICE_FINGERPRINT_MISMATCH = 'device_fingerprint_mismatch',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  SYNTHETIC_IDENTITY_SUSPECTED = 'synthetic_identity_suspected'
}

interface FraudEvidence {
  riskFactors: RiskFactor[];
  behavioralIndicators: BehavioralIndicator[];
  technicalIndicators: TechnicalIndicator[];
  externalDataPoints: ExternalDataPoint[];
  historicalPatterns: HistoricalPattern[];
}
```

### Advanced Fraud Detection Engine

```typescript
import { MLFraudModel } from './ml-models';
import { BehavioralAnalyzer } from './behavioral-analysis';
import { RiskScoreCalculator } from './risk-scoring';

class AdvancedFraudDetectionEngine {
  private mlModel: MLFraudModel;
  private behavioralAnalyzer: BehavioralAnalyzer;
  private riskCalculator: RiskScoreCalculator;
  private ruleEngine: FraudRuleEngine;
  private featureExtractor: FraudFeatureExtractor;

  constructor() {
    this.mlModel = new MLFraudModel();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.riskCalculator = new RiskScoreCalculator();
    this.ruleEngine = new FraudRuleEngine();
    this.featureExtractor = new FraudFeatureExtractor();
  }

  async evaluateTransaction(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<FraudEvaluationResult> {
    try {
      // Extract features for analysis
      const features = await this.featureExtractor.extractFeatures(transaction, context);
      
      // Run parallel fraud checks
      const [
        mlScore,
        ruleBasedScore,
        behavioralScore,
        velocityScore,
        deviceScore
      ] = await Promise.all([
        this.mlModel.predict(features),
        this.ruleEngine.evaluate(transaction, context),
        this.behavioralAnalyzer.analyze(transaction, context),
        this.evaluateVelocityRisk(transaction, context),
        this.evaluateDeviceRisk(transaction, context)
      ]);

      // Calculate composite risk score
      const compositeScore = this.calculateCompositeRiskScore({
        mlScore,
        ruleBasedScore,
        behavioralScore,
        velocityScore,
        deviceScore
      });

      // Determine risk level and actions
      const riskLevel = this.determineRiskLevel(compositeScore);
      const recommendedActions = await this.determineActions(compositeScore, features);
      
      // Generate detailed explanation
      const explanation = this.generateRiskExplanation({
        compositeScore,
        mlScore,
        ruleBasedScore,
        behavioralScore,
        features
      });

      return {
        transactionId: transaction.id,
        riskScore: compositeScore,
        riskLevel,
        confidence: this.calculateConfidence([mlScore, ruleBasedScore, behavioralScore]),
        recommendedActions,
        explanation,
        triggeredRules: ruleBasedScore.triggeredRules,
        evaluatedAt: new Date(),
        processingTime: Date.now() - context.startTime
      };

    } catch (error) {
      console.error('Fraud evaluation failed:', error);
      throw new FraudEvaluationError('Failed to evaluate transaction for fraud', error);
    }
  }

  private calculateCompositeRiskScore(scores: FraudScores): number {
    const weights = {
      mlScore: 0.35,
      ruleBasedScore: 0.25,
      behavioralScore: 0.20,
      velocityScore: 0.15,
      deviceScore: 0.05
    };

    return (
      scores.mlScore.score * weights.mlScore +
      scores.ruleBasedScore.score * weights.ruleBasedScore +
      scores.behavioralScore.score * weights.behavioralScore +
      scores.velocityScore * weights.velocityScore +
      scores.deviceScore * weights.deviceScore
    );
  }

  private async evaluateVelocityRisk(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<number> {
    const velocityRules = [
      { timeWindow: 3600000, maxTransactions: 10, weight: 0.4 }, // 1 hour
      { timeWindow: 86400000, maxTransactions: 50, weight: 0.3 }, // 24 hours
      { timeWindow: 604800000, maxTransactions: 200, weight: 0.2 }, // 7 days
      { timeWindow: 2592000000, maxTransactions: 500, weight: 0.1 } // 30 days
    ];

    let totalRisk = 0;

    for (const rule of velocityRules) {
      const recentTransactions = await this.getRecentTransactions(
        context.userId,
        rule.timeWindow
      );

      const violationRatio = recentTransactions.length / rule.maxTransactions;
      const ruleRisk = Math.min(violationRatio, 1.0);
      
      totalRisk += ruleRisk * rule.weight;
    }

    return Math.min(totalRisk, 1.0);
  }

  private async evaluateDeviceRisk(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<number> {
    let deviceRisk = 0;

    // Device fingerprint analysis
    const deviceHistory = await this.getDeviceHistory(context.deviceFingerprint);
    
    if (deviceHistory.length === 0) {
      deviceRisk += 0.3; // New device
    }

    // IP reputation check
    const ipReputation = await this.checkIPReputation(context.ipAddress);
    if (ipReputation.isMalicious) {
      deviceRisk += 0.5;
    }

    // Geographic consistency
    const geoConsistency = await this.checkGeographicConsistency(
      context.userId,
      context.geolocation
    );
    
    if (!geoConsistency.isConsistent) {
      deviceRisk += 0.4 * (1 - geoConsistency.confidence);
    }

    // User agent analysis
    const userAgentRisk = await this.analyzeUserAgent(context.userAgent);
    deviceRisk += userAgentRisk * 0.2;

    return Math.min(deviceRisk, 1.0);
  }

  async adaptiveFraudDetection(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<AdaptiveFraudResult> {
    // Get user's historical behavior profile
    const userProfile = await this.getUserBehaviorProfile(context.userId);
    
    // Adjust detection sensitivity based on user profile
    const adaptedThresholds = this.adaptThresholds(userProfile);
    
    // Apply adapted detection
    const baseResult = await this.evaluateTransaction(transaction, context);
    
    // Apply user-specific adjustments
    const adaptedScore = this.applyUserSpecificAdjustments(
      baseResult.riskScore,
      userProfile,
      transaction
    );

    // Dynamic risk adjustment based on recent patterns
    const patternAdjustment = await this.calculatePatternAdjustment(
      context.userId,
      transaction
    );

    const finalScore = Math.max(0, Math.min(1, adaptedScore + patternAdjustment));

    return {
      ...baseResult,
      originalRiskScore: baseResult.riskScore,
      adaptedRiskScore: finalScore,
      userProfile,
      adaptationFactors: {
        userTrust: userProfile.trustScore,
        behaviorConsistency: userProfile.consistencyScore,
        patternAdjustment,
        adaptedThresholds
      }
    };
  }

  private async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile> {
    const [
      transactionHistory,
      loginPatterns,
      deviceHistory,
      supportHistory
    ] = await Promise.all([
      this.getTransactionHistory(userId, 180), // 6 months
      this.getLoginPatterns(userId, 90), // 3 months
      this.getDeviceHistory(userId, 365), // 1 year
      this.getSupportHistory(userId, 365) // 1 year
    ]);

    const trustScore = this.calculateTrustScore({
      transactionHistory,
      loginPatterns,
      deviceHistory,
      supportHistory
    });

    const consistencyScore = this.calculateConsistencyScore({
      transactionHistory,
      loginPatterns
    });

    const riskProfile = this.assessUserRiskProfile({
      transactionHistory,
      supportHistory
    });

    return {
      userId,
      trustScore,
      consistencyScore,
      riskProfile,
      behaviorPatterns: {
        typicalTransactionAmount: this.calculateTypicalAmount(transactionHistory),
        preferredPaymentTimes: this.analyzePaymentTiming(transactionHistory),
        geographicPattern: this.analyzeGeographicPattern(transactionHistory),
        deviceConsistency: this.analyzeDeviceConsistency(deviceHistory)
      },
      lastUpdated: new Date()
    };
  }
}
```

## Machine Learning Fraud Models

### Deep Learning Fraud Detection

```typescript
class MLFraudModel {
  private neuralNetwork: FraudNeuralNetwork;
  private ensembleModel: EnsembleClassifier;
  private featureEngineering: FeatureEngineeringPipeline;
  private modelMetrics: ModelPerformanceMetrics;

  constructor() {
    this.neuralNetwork = new FraudNeuralNetwork();
    this.ensembleModel = new EnsembleClassifier();
    this.featureEngineering = new FeatureEngineeringPipeline();
    this.modelMetrics = new ModelPerformanceMetrics();
  }

  async predict(features: FraudFeatures): Promise<MLPredictionResult> {
    try {
      // Feature engineering and preprocessing
      const processedFeatures = await this.featureEngineering.process(features);
      
      // Run multiple models in parallel
      const [
        neuralNetworkResult,
        ensembleResult,
        anomalyDetectionResult
      ] = await Promise.all([
        this.neuralNetwork.predict(processedFeatures),
        this.ensembleModel.predict(processedFeatures),
        this.detectAnomalies(processedFeatures)
      ]);

      // Combine predictions with weighted voting
      const combinedScore = this.combineModelPredictions([
        { score: neuralNetworkResult.fraudProbability, weight: 0.5, confidence: neuralNetworkResult.confidence },
        { score: ensembleResult.fraudProbability, weight: 0.3, confidence: ensembleResult.confidence },
        { score: anomalyDetectionResult.anomalyScore, weight: 0.2, confidence: anomalyDetectionResult.confidence }
      ]);

      // Generate feature importance
      const featureImportance = await this.calculateFeatureImportance(processedFeatures);
      
      // Model explanation
      const explanation = await this.generateModelExplanation(
        processedFeatures,
        combinedScore,
        featureImportance
      );

      return {
        score: combinedScore.score,
        confidence: combinedScore.confidence,
        featureImportance,
        explanation,
        modelVersions: {
          neuralNetwork: neuralNetworkResult.modelVersion,
          ensemble: ensembleResult.modelVersion,
          anomalyDetection: anomalyDetectionResult.modelVersion
        },
        processingTime: Date.now() - features.timestamp
      };

    } catch (error) {
      console.error('ML fraud prediction failed:', error);
      throw new MLPredictionError('Machine learning fraud prediction failed', error);
    }
  }

  async trainModel(trainingData: FraudTrainingData): Promise<TrainingResult> {
    // Prepare training dataset
    const { features, labels } = await this.prepareTrainingData(trainingData);
    
    // Split data for training and validation
    const { trainSet, validationSet, testSet } = this.splitDataset(features, labels);
    
    // Train neural network
    const nnTrainingResult = await this.neuralNetwork.train(trainSet, validationSet);
    
    // Train ensemble models
    const ensembleTrainingResult = await this.ensembleModel.train(trainSet, validationSet);
    
    // Evaluate models on test set
    const evaluation = await this.evaluateModels(testSet);
    
    // Update model metrics
    await this.modelMetrics.updateMetrics(evaluation);
    
    return {
      trainingAccuracy: evaluation.accuracy,
      validationAccuracy: evaluation.validationAccuracy,
      precision: evaluation.precision,
      recall: evaluation.recall,
      f1Score: evaluation.f1Score,
      auc: evaluation.auc,
      falsePositiveRate: evaluation.falsePositiveRate,
      falseNegativeRate: evaluation.falseNegativeRate,
      confusionMatrix: evaluation.confusionMatrix,
      trainingTime: nnTrainingResult.trainingTime + ensembleTrainingResult.trainingTime,
      modelVersions: {
        neuralNetwork: nnTrainingResult.version,
        ensemble: ensembleTrainingResult.version
      }
    };
  }

  private async detectAnomalies(features: ProcessedFraudFeatures): Promise<AnomalyDetectionResult> {
    // Use isolation forest for anomaly detection
    const isolationForest = new IsolationForest();
    const anomalyScore = await isolationForest.predict(features.numerical);
    
    // Use one-class SVM for additional validation
    const oneClassSVM = new OneClassSVM();
    const svmScore = await oneClassSVM.predict(features.numerical);
    
    // Combine anomaly scores
    const combinedScore = (anomalyScore + svmScore) / 2;
    
    return {
      anomalyScore: combinedScore,
      confidence: Math.abs(anomalyScore - svmScore) < 0.2 ? 0.9 : 0.6, // High confidence if models agree
      isolationForestScore: anomalyScore,
      svmScore: svmScore,
      modelVersion: '1.2.0'
    };
  }

  async continuousLearning(
    newTransactions: FraudLabeledTransaction[]
  ): Promise<ContinuousLearningResult> {
    // Filter high-confidence labeled transactions
    const highConfidenceTransactions = newTransactions.filter(
      t => t.label.confidence > 0.9
    );

    if (highConfidenceTransactions.length < 100) {
      return {
        updated: false,
        reason: 'Insufficient high-confidence samples for model update'
      };
    }

    // Prepare incremental training data
    const incrementalData = await this.prepareIncrementalData(highConfidenceTransactions);
    
    // Perform incremental learning
    const updateResult = await this.performIncrementalUpdate(incrementalData);
    
    // Validate model performance on holdout set
    const validationResult = await this.validateUpdatedModel();
    
    if (validationResult.accuracy < this.modelMetrics.getCurrentAccuracy() * 0.95) {
      // Rollback if performance degrades significantly
      await this.rollbackModel();
      return {
        updated: false,
        reason: 'Model performance degraded after update',
        rollback: true
      };
    }

    // Deploy updated model
    await this.deployUpdatedModel();
    
    return {
      updated: true,
      newAccuracy: validationResult.accuracy,
      samplesUsed: incrementalData.samples.length,
      improvementRatio: validationResult.accuracy / this.modelMetrics.getCurrentAccuracy(),
      deployedAt: new Date()
    };
  }

  private combineModelPredictions(predictions: ModelPrediction[]): CombinedPrediction {
    const totalWeight = predictions.reduce((sum, p) => sum + p.weight * p.confidence, 0);
    const weightedScore = predictions.reduce(
      (sum, p) => sum + p.score * p.weight * p.confidence, 0
    ) / totalWeight;
    
    const averageConfidence = predictions.reduce(
      (sum, p) => sum + p.confidence, 0
    ) / predictions.length;

    return {
      score: weightedScore,
      confidence: averageConfidence
    };
  }

  async generateModelExplanation(
    features: ProcessedFraudFeatures,
    prediction: number,
    featureImportance: FeatureImportance[]
  ): Promise<ModelExplanation> {
    // Get top contributing features
    const topFeatures = featureImportance
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    // Generate human-readable explanations
    const explanations: string[] = [];
    
    for (const feature of topFeatures) {
      const explanation = await this.generateFeatureExplanation(
        feature,
        features[feature.name]
      );
      explanations.push(explanation);
    }

    return {
      prediction,
      confidence: prediction > 0.5 ? prediction : 1 - prediction,
      topFeatures: topFeatures.map(f => f.name),
      explanations,
      riskFactors: this.identifyRiskFactors(topFeatures, features),
      recommendations: this.generateRecommendations(prediction, topFeatures)
    };
  }
}
```

## Behavioral Analysis System

### Advanced Behavioral Detection

```typescript
class BehavioralAnalyzer {
  private behaviorProfiler: UserBehaviorProfiler;
  private anomalyDetector: BehavioralAnomalyDetector;
  private sequenceAnalyzer: SequencePatternAnalyzer;
  private timingAnalyzer: TimingPatternAnalyzer;

  constructor() {
    this.behaviorProfiler = new UserBehaviorProfiler();
    this.anomalyDetector = new BehavioralAnomalyDetector();
    this.sequenceAnalyzer = new SequencePatternAnalyzer();
    this.timingAnalyzer = new TimingPatternAnalyzer();
  }

  async analyze(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<BehavioralAnalysisResult> {
    try {
      // Get user's behavioral baseline
      const behaviorProfile = await this.behaviorProfiler.getProfile(context.userId);
      
      // Analyze different behavioral dimensions
      const [
        transactionBehavior,
        navigationBehavior,
        timingBehavior,
        deviceBehavior,
        sessionBehavior
      ] = await Promise.all([
        this.analyzeTransactionBehavior(transaction, behaviorProfile),
        this.analyzeNavigationBehavior(context, behaviorProfile),
        this.analyzeTimingBehavior(transaction, context, behaviorProfile),
        this.analyzeDeviceBehavior(context, behaviorProfile),
        this.analyzeSessionBehavior(context, behaviorProfile)
      ]);

      // Calculate composite behavioral score
      const behavioralScore = this.calculateBehavioralScore({
        transactionBehavior,
        navigationBehavior,
        timingBehavior,
        deviceBehavior,
        sessionBehavior
      });

      // Identify behavioral anomalies
      const anomalies = await this.identifyBehavioralAnomalies({
        transactionBehavior,
        navigationBehavior,
        timingBehavior,
        deviceBehavior,
        sessionBehavior
      });

      return {
        score: behavioralScore,
        confidence: this.calculateConfidence(behavioralScore, anomalies),
        anomalies,
        behaviorProfile,
        analysisBreakdown: {
          transactionBehavior,
          navigationBehavior,
          timingBehavior,
          deviceBehavior,
          sessionBehavior
        },
        recommendations: this.generateBehavioralRecommendations(anomalies)
      };

    } catch (error) {
      console.error('Behavioral analysis failed:', error);
      throw new BehavioralAnalysisError('Failed to analyze user behavior', error);
    }
  }

  private async analyzeTransactionBehavior(
    transaction: IPaymentTransaction,
    profile: UserBehaviorProfile
  ): Promise<TransactionBehaviorAnalysis> {
    const analysis: TransactionBehaviorAnalysis = {
      amountDeviation: 0,
      paymentMethodConsistency: 0,
      frequencyPattern: 0,
      categoryConsistency: 0,
      riskScore: 0
    };

    // Amount pattern analysis
    const typicalAmount = profile.behaviorPatterns.typicalTransactionAmount;
    analysis.amountDeviation = Math.abs(transaction.amount - typicalAmount.mean) / 
                              Math.max(typicalAmount.standardDeviation, 1);

    // Payment method consistency
    const preferredMethods = profile.behaviorPatterns.preferredPaymentMethods;
    const methodMatch = preferredMethods.find(m => m.method === transaction.paymentMethod);
    analysis.paymentMethodConsistency = methodMatch ? methodMatch.frequency : 0;

    // Transaction frequency analysis
    const recentTransactions = await this.getRecentTransactions(profile.userId, 30);
    const averageFrequency = profile.behaviorPatterns.averageTransactionFrequency;
    const currentFrequency = recentTransactions.length / 30;
    analysis.frequencyPattern = Math.abs(currentFrequency - averageFrequency) / 
                               Math.max(averageFrequency, 0.1);

    // Calculate risk score
    analysis.riskScore = this.calculateTransactionRisk(analysis);

    return analysis;
  }

  private async analyzeNavigationBehavior(
    context: TransactionContext,
    profile: UserBehaviorProfile
  ): Promise<NavigationBehaviorAnalysis> {
    const analysis: NavigationBehaviorAnalysis = {
      pathDeviation: 0,
      speedConsistency: 0,
      clickPatterns: 0,
      riskScore: 0
    };

    // Navigation path analysis
    if (context.navigationPath) {
      const typicalPaths = profile.behaviorPatterns.typicalNavigationPaths;
      const pathSimilarity = this.calculatePathSimilarity(
        context.navigationPath,
        typicalPaths
      );
      analysis.pathDeviation = 1 - pathSimilarity;
    }

    // Navigation speed analysis
    if (context.navigationTiming) {
      const typicalSpeed = profile.behaviorPatterns.averageNavigationSpeed;
      const currentSpeed = this.calculateNavigationSpeed(context.navigationTiming);
      analysis.speedConsistency = Math.abs(currentSpeed - typicalSpeed) / 
                                 Math.max(typicalSpeed, 1);
    }

    // Click pattern analysis
    if (context.clickEvents) {
      const clickPattern = this.analyzeClickPattern(context.clickEvents);
      const typicalPattern = profile.behaviorPatterns.typicalClickPattern;
      analysis.clickPatterns = this.compareClickPatterns(clickPattern, typicalPattern);
    }

    analysis.riskScore = this.calculateNavigationRisk(analysis);

    return analysis;
  }

  private async analyzeTimingBehavior(
    transaction: IPaymentTransaction,
    context: TransactionContext,
    profile: UserBehaviorProfile
  ): Promise<TimingBehaviorAnalysis> {
    const analysis: TimingBehaviorAnalysis = {
      timeOfDayDeviation: 0,
      dayOfWeekPattern: 0,
      sessionDuration: 0,
      formFillSpeed: 0,
      riskScore: 0
    };

    // Time of day analysis
    const transactionHour = transaction.createdAt.getHours();
    const typicalHours = profile.behaviorPatterns.preferredPaymentTimes;
    const hourMatch = typicalHours.find(h => Math.abs(h.hour - transactionHour) <= 1);
    analysis.timeOfDayDeviation = hourMatch ? 0 : 1;

    // Day of week analysis
    const transactionDay = transaction.createdAt.getDay();
    const typicalDays = profile.behaviorPatterns.preferredPaymentDays;
    const dayMatch = typicalDays.find(d => d.day === transactionDay);
    analysis.dayOfWeekPattern = dayMatch ? dayMatch.frequency : 0.1;

    // Session duration analysis
    if (context.sessionStartTime) {
      const sessionDuration = Date.now() - context.sessionStartTime.getTime();
      const typicalDuration = profile.behaviorPatterns.averageSessionDuration;
      analysis.sessionDuration = Math.abs(sessionDuration - typicalDuration) / 
                                Math.max(typicalDuration, 60000); // 1 minute minimum
    }

    // Form filling speed analysis
    if (context.formEvents) {
      const fillSpeed = this.calculateFormFillSpeed(context.formEvents);
      const typicalSpeed = profile.behaviorPatterns.averageFormFillSpeed;
      analysis.formFillSpeed = Math.abs(fillSpeed - typicalSpeed) / 
                              Math.max(typicalSpeed, 1);
    }

    analysis.riskScore = this.calculateTimingRisk(analysis);

    return analysis;
  }

  async detectAccountTakeover(
    userId: string,
    context: TransactionContext
  ): Promise<AccountTakeoverAssessment> {
    // Analyze behavioral deviations
    const behaviorProfile = await this.behaviorProfiler.getProfile(userId);
    const currentBehavior = await this.extractCurrentBehavior(context);
    
    // Calculate deviation scores
    const deviations = {
      locationDeviation: this.calculateLocationDeviation(
        context.geolocation,
        behaviorProfile.behaviorPatterns.geographicPattern
      ),
      deviceDeviation: this.calculateDeviceDeviation(
        context.deviceFingerprint,
        behaviorProfile.behaviorPatterns.deviceConsistency
      ),
      timingDeviation: this.calculateTimingDeviation(
        context.timestamp,
        behaviorProfile.behaviorPatterns.preferredPaymentTimes
      ),
      behaviorDeviation: this.calculateBehaviorDeviation(
        currentBehavior,
        behaviorProfile
      )
    };

    // Calculate composite takeover risk
    const takeoverRisk = this.calculateTakeoverRisk(deviations);
    
    // Identify specific indicators
    const indicators = this.identifyTakeoverIndicators(deviations, context);

    return {
      userId,
      riskScore: takeoverRisk,
      confidence: this.calculateTakeoverConfidence(deviations),
      indicators,
      deviations,
      recommendedActions: this.generateTakeoverActions(takeoverRisk, indicators),
      assessedAt: new Date()
    };
  }

  private calculateBehavioralScore(analysis: BehavioralAnalysisComponents): number {
    const weights = {
      transactionBehavior: 0.3,
      navigationBehavior: 0.2,
      timingBehavior: 0.2,
      deviceBehavior: 0.15,
      sessionBehavior: 0.15
    };

    return (
      analysis.transactionBehavior.riskScore * weights.transactionBehavior +
      analysis.navigationBehavior.riskScore * weights.navigationBehavior +
      analysis.timingBehavior.riskScore * weights.timingBehavior +
      analysis.deviceBehavior.riskScore * weights.deviceBehavior +
      analysis.sessionBehavior.riskScore * weights.sessionBehavior
    );
  }
}
```

## Real-Time Fraud Monitoring

### Real-Time Detection System

```typescript
class RealTimeFraudMonitor {
  private eventStream: FraudEventStream;
  private realTimeRules: RealTimeFraudRules;
  private alertManager: FraudAlertManager;
  private dashboardUpdater: FraudDashboardUpdater;
  private responseOrchestrator: FraudResponseOrchestrator;

  constructor() {
    this.eventStream = new FraudEventStream();
    this.realTimeRules = new RealTimeFraudRules();
    this.alertManager = new FraudAlertManager();
    this.dashboardUpdater = new FraudDashboardUpdater();
    this.responseOrchestrator = new FraudResponseOrchestrator();
  }

  async startRealTimeMonitoring(): Promise<void> {
    // Initialize event stream processing
    await this.eventStream.initialize();
    
    // Set up real-time fraud rules
    await this.realTimeRules.loadRules();
    
    // Start processing transaction stream
    this.eventStream.onTransaction(async (transaction, context) => {
      await this.processTransactionRealTime(transaction, context);
    });
    
    // Start processing user behavior stream
    this.eventStream.onBehaviorEvent(async (event) => {
      await this.processBehaviorEventRealTime(event);
    });
    
    // Set up periodic monitoring tasks
    this.setupPeriodicMonitoring();
  }

  private async processTransactionRealTime(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Fast fraud screening (< 100ms)
      const quickScreen = await this.performQuickFraudScreen(transaction, context);
      
      if (quickScreen.requiresFullAnalysis) {
        // Full fraud analysis in parallel
        const fullAnalysisPromise = this.performFullFraudAnalysis(transaction, context);
        
        // Continue with quick screen results while full analysis runs
        if (quickScreen.riskLevel === 'high' || quickScreen.riskLevel === 'critical') {
          await this.handleHighRiskTransaction(transaction, quickScreen);
        }
        
        // Wait for full analysis
        const fullAnalysis = await fullAnalysisPromise;
        
        // Update decision based on full analysis
        await this.reconcileAnalysisResults(transaction, quickScreen, fullAnalysis);
      }
      
      // Update real-time metrics
      await this.updateRealTimeMetrics(transaction, context, startTime);
      
    } catch (error) {
      console.error('Real-time fraud processing failed:', error);
      // Fail-safe: allow transaction but log error
      await this.handleProcessingError(transaction, error);
    }
  }

  private async performQuickFraudScreen(
    transaction: IPaymentTransaction,
    context: TransactionContext
  ): Promise<QuickScreenResult> {
    // Fast checks that can complete in < 100ms
    const [
      blacklistCheck,
      velocityCheck,
      amountCheck,
      geoCheck
    ] = await Promise.all([
      this.checkBlacklists(transaction, context),
      this.performFastVelocityCheck(transaction, context),
      this.checkTransactionAmount(transaction, context),
      this.performFastGeoCheck(transaction, context)
    ]);

    const quickRiskScore = this.calculateQuickRiskScore({
      blacklistCheck,
      velocityCheck,
      amountCheck,
      geoCheck
    });

    const riskLevel = this.determineRiskLevel(quickRiskScore);
    const requiresFullAnalysis = riskLevel !== 'low' || quickRiskScore > 0.3;

    return {
      riskScore: quickRiskScore,
      riskLevel,
      requiresFullAnalysis,
      checks: {
        blacklistCheck,
        velocityCheck,
        amountCheck,
        geoCheck
      },
      processingTime: Date.now() - context.startTime
    };
  }

  private async handleHighRiskTransaction(
    transaction: IPaymentTransaction,
    screenResult: QuickScreenResult
  ): Promise<void> {
    // Immediate actions for high-risk transactions
    const actions = [];

    if (screenResult.riskLevel === 'critical') {
      // Block transaction immediately
      actions.push({
        type: 'block_transaction',
        reason: 'Critical fraud risk detected',
        immediate: true
      });
      
      // Alert security team
      await this.alertManager.sendCriticalAlert({
        transactionId: transaction.id,
        riskScore: screenResult.riskScore,
        reason: 'Critical fraud risk - transaction blocked',
        timestamp: new Date()
      });
    } else if (screenResult.riskLevel === 'high') {
      // Hold transaction for review
      actions.push({
        type: 'hold_for_review',
        reason: 'High fraud risk detected',
        immediate: true
      });
      
      // Trigger additional verification
      actions.push({
        type: 'additional_verification',
        method: 'sms_otp',
        immediate: false
      });
    }

    // Execute actions
    await this.responseOrchestrator.executeActions(transaction, actions);
  }

  async monitorFraudPatterns(): Promise<PatternMonitoringResult> {
    const [
      velocityPatterns,
      geographicPatterns,
      devicePatterns,
      paymentPatterns
    ] = await Promise.all([
      this.detectVelocityPatterns(),
      this.detectGeographicPatterns(),
      this.detectDevicePatterns(),
      this.detectPaymentPatterns()
    ]);

    const suspiciousPatterns = [
      ...velocityPatterns.filter(p => p.suspicionLevel > 0.7),
      ...geographicPatterns.filter(p => p.suspicionLevel > 0.7),
      ...devicePatterns.filter(p => p.suspicionLevel > 0.7),
      ...paymentPatterns.filter(p => p.suspicionLevel > 0.7)
    ];

    // Generate alerts for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.suspicionLevel > 0.9) {
        await this.alertManager.sendPatternAlert(pattern);
      }
    }

    return {
      totalPatternsDetected: velocityPatterns.length + geographicPatterns.length + 
                            devicePatterns.length + paymentPatterns.length,
      suspiciousPatternsCount: suspiciousPatterns.length,
      criticalPatternsCount: suspiciousPatterns.filter(p => p.suspicionLevel > 0.9).length,
      patterns: {
        velocity: velocityPatterns,
        geographic: geographicPatterns,
        device: devicePatterns,
        payment: paymentPatterns
      },
      actionsTaken: suspiciousPatterns.length,
      monitoringTimestamp: new Date()
    };
  }

  private async detectVelocityPatterns(): Promise<VelocityPattern[]> {
    const patterns: VelocityPattern[] = [];
    
    // Detect card testing patterns
    const cardTestingPattern = await this.detectCardTesting();
    if (cardTestingPattern) {
      patterns.push(cardTestingPattern);
    }
    
    // Detect account enumeration
    const enumerationPattern = await this.detectAccountEnumeration();
    if (enumerationPattern) {
      patterns.push(enumerationPattern);
    }
    
    // Detect rapid fire transactions
    const rapidFirePattern = await this.detectRapidFireTransactions();
    if (rapidFirePattern) {
      patterns.push(rapidFirePattern);
    }

    return patterns;
  }

  private async detectCardTesting(): Promise<VelocityPattern | null> {
    // Look for rapid-fire small transactions with different cards
    const recentTransactions = await this.getRecentTransactions(3600000); // 1 hour
    
    // Group by IP address or device fingerprint
    const groupedByIP = this.groupTransactionsByIP(recentTransactions);
    
    for (const [ipAddress, transactions] of groupedByIP) {
      if (transactions.length > 10) { // More than 10 transactions from same IP
        const uniqueCards = new Set(transactions.map(t => t.paymentMethod.last4Digits));
        const smallAmounts = transactions.filter(t => t.amount < 10).length;
        const failureRate = transactions.filter(t => t.status === 'failed').length / transactions.length;
        
        if (uniqueCards.size > 5 && smallAmounts > 8 && failureRate > 0.3) {
          return {
            type: 'card_testing',
            suspicionLevel: Math.min(0.9, uniqueCards.size * 0.1 + failureRate),
            description: `Potential card testing from IP ${ipAddress}`,
            metadata: {
              ipAddress,
              transactionCount: transactions.length,
              uniqueCards: uniqueCards.size,
              failureRate,
              timeWindow: '1 hour'
            }
          };
        }
      }
    }
    
    return null;
  }

  async setupAutomatedResponse(): Promise<void> {
    // Configure automated responses to fraud patterns
    await this.responseOrchestrator.configure({
      // Critical risk - immediate block
      criticalRisk: {
        actions: ['block_transaction', 'alert_security_team', 'log_incident'],
        requiresApproval: false,
        autoExecute: true
      },
      
      // High risk - hold for review
      highRisk: {
        actions: ['hold_transaction', 'request_additional_auth', 'alert_ops_team'],
        requiresApproval: false,
        autoExecute: true
      },
      
      // Medium risk - enhanced monitoring
      mediumRisk: {
        actions: ['flag_for_monitoring', 'collect_additional_data'],
        requiresApproval: true,
        autoExecute: false
      },
      
      // Pattern detection responses
      suspiciousPattern: {
        actions: ['temporary_rate_limit', 'enhanced_screening', 'alert_analyst'],
        requiresApproval: false,
        autoExecute: true
      }
    });
  }

  private setupPeriodicMonitoring(): void {
    // Monitor fraud patterns every 15 minutes
    setInterval(async () => {
      await this.monitorFraudPatterns();
    }, 900000); // 15 minutes

    // Update fraud metrics every 5 minutes
    setInterval(async () => {
      await this.updateFraudMetrics();
    }, 300000); // 5 minutes

    // Cleanup old events every hour
    setInterval(async () => {
      await this.cleanupOldEvents();
    }, 3600000); // 1 hour

    // Generate fraud reports daily
    setInterval(async () => {
      await this.generateDailyFraudReport();
    }, 86400000); // 24 hours
  }
}
```

## Fraud Investigation System

### Investigation Workflow Engine

```typescript
class FraudInvestigationSystem {
  private investigationWorkflow: InvestigationWorkflow;
  private evidenceCollector: FraudEvidenceCollector;
  private caseManager: FraudCaseManager;
  private reportGenerator: FraudReportGenerator;

  constructor() {
    this.investigationWorkflow = new InvestigationWorkflow();
    this.evidenceCollector = new FraudEvidenceCollector();
    this.caseManager = new FraudCaseManager();
    this.reportGenerator = new FraudReportGenerator();
  }

  async createFraudCase(
    fraudEvent: IFraudEvent,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<FraudCase> {
    try {
      // Create initial case
      const fraudCase = await this.caseManager.createCase({
        eventId: fraudEvent.id,
        priority,
        assignedTo: await this.assignInvestigator(priority, fraudEvent),
        status: 'open',
        createdAt: new Date()
      });

      // Collect initial evidence
      const evidence = await this.evidenceCollector.collectEvidence(fraudEvent);
      await this.caseManager.addEvidence(fraudCase.id, evidence);

      // Start investigation workflow
      await this.investigationWorkflow.startWorkflow(fraudCase);

      // Send notifications
      await this.notifyStakeholders(fraudCase);

      return fraudCase;

    } catch (error) {
      console.error('Failed to create fraud case:', error);
      throw new FraudCaseError('Failed to create fraud investigation case', error);
    }
  }

  async investigateTransaction(
    transactionId: string,
    investigatorId: string
  ): Promise<InvestigationResult> {
    // Get transaction details and context
    const transaction = await this.getTransactionDetails(transactionId);
    const context = await this.getTransactionContext(transactionId);
    
    // Collect comprehensive evidence
    const evidence = await this.evidenceCollector.collectComprehensiveEvidence({
      transaction,
      context,
      timeWindow: 86400000 // 24 hours
    });

    // Analyze patterns and connections
    const patternAnalysis = await this.analyzeTransactionPatterns(transaction, evidence);
    
    // Check for related fraudulent activities
    const relatedActivities = await this.findRelatedFraudulentActivities(transaction);
    
    // Generate investigation report
    const report = await this.reportGenerator.generateInvestigationReport({
      transaction,
      evidence,
      patternAnalysis,
      relatedActivities,
      investigatorId
    });

    // Determine recommended actions
    const recommendedActions = this.determineRecommendedActions(
      evidence,
      patternAnalysis,
      relatedActivities
    );

    return {
      transactionId,
      investigatorId,
      evidence,
      patternAnalysis,
      relatedActivities,
      report,
      recommendedActions,
      investigatedAt: new Date()
    };
  }

  private async collectComprehensiveEvidence(params: {
    transaction: IPaymentTransaction;
    context: TransactionContext;
    timeWindow: number;
  }): Promise<ComprehensiveEvidence> {
    const { transaction, context, timeWindow } = params;
    
    const [
      userHistory,
      deviceHistory,
      ipHistory,
      relatedTransactions,
      externalData
    ] = await Promise.all([
      this.getUserHistory(transaction.userId, timeWindow),
      this.getDeviceHistory(context.deviceFingerprint, timeWindow),
      this.getIPHistory(context.ipAddress, timeWindow),
      this.getRelatedTransactions(transaction, timeWindow),
      this.getExternalFraudData(transaction, context)
    ]);

    return {
      transactionDetails: transaction,
      contextData: context,
      userBehaviorHistory: userHistory,
      deviceIntelligence: deviceHistory,
      ipIntelligence: ipHistory,
      relatedTransactions,
      externalFraudIndicators: externalData,
      timelineAnalysis: this.createTimelineAnalysis([
        ...userHistory,
        ...deviceHistory,
        ...ipHistory,
        ...relatedTransactions
      ]),
      riskAssessment: await this.performComprehensiveRiskAssessment({
        transaction,
        userHistory,
        deviceHistory,
        ipHistory
      })
    };
  }

  async generateFraudReport(
    caseId: string,
    reportType: 'summary' | 'detailed' | 'legal'
  ): Promise<FraudReport> {
    const fraudCase = await this.caseManager.getCase(caseId);
    const evidence = await this.caseManager.getCaseEvidence(caseId);
    const investigation = await this.caseManager.getInvestigationHistory(caseId);

    let report: FraudReport;

    switch (reportType) {
      case 'summary':
        report = await this.reportGenerator.generateSummaryReport({
          case: fraudCase,
          evidence,
          investigation
        });
        break;

      case 'detailed':
        report = await this.reportGenerator.generateDetailedReport({
          case: fraudCase,
          evidence,
          investigation
        });
        break;

      case 'legal':
        report = await this.reportGenerator.generateLegalReport({
          case: fraudCase,
          evidence,
          investigation
        });
        break;

      default:
        throw new ReportGenerationError(`Unsupported report type: ${reportType}`);
    }

    // Store report
    await this.caseManager.storeReport(caseId, report);

    return report;
  }

  private async analyzeTransactionPatterns(
    transaction: IPaymentTransaction,
    evidence: ComprehensiveEvidence
  ): Promise<PatternAnalysis> {
    const patterns: DetectedPattern[] = [];

    // Analyze velocity patterns
    const velocityPattern = this.analyzeVelocityPattern(
      transaction,
      evidence.relatedTransactions
    );
    if (velocityPattern.score > 0.5) {
      patterns.push(velocityPattern);
    }

    // Analyze geographic patterns
    const geoPattern = this.analyzeGeographicPattern(
      transaction,
      evidence.userBehaviorHistory
    );
    if (geoPattern.score > 0.5) {
      patterns.push(geoPattern);
    }

    // Analyze device patterns
    const devicePattern = this.analyzeDevicePattern(
      transaction,
      evidence.deviceIntelligence
    );
    if (devicePattern.score > 0.5) {
      patterns.push(devicePattern);
    }

    // Analyze behavioral patterns
    const behaviorPattern = this.analyzeBehavioralPattern(
      transaction,
      evidence.userBehaviorHistory
    );
    if (behaviorPattern.score > 0.5) {
      patterns.push(behaviorPattern);
    }

    return {
      detectedPatterns: patterns,
      overallPatternScore: patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length,
      confidence: this.calculatePatternConfidence(patterns),
      recommendations: this.generatePatternRecommendations(patterns)
    };
  }

  async closeFraudCase(
    caseId: string,
    resolution: FraudCaseResolution,
    investigatorId: string
  ): Promise<void> {
    // Update case status
    await this.caseManager.updateCaseStatus(caseId, 'closed');
    
    // Record resolution
    await this.caseManager.recordResolution(caseId, {
      resolution,
      investigatorId,
      closedAt: new Date(),
      notes: resolution.notes
    });

    // Update ML models with feedback
    if (resolution.confirmed !== undefined) {
      await this.updateModelFeedback(caseId, resolution.confirmed);
    }

    // Generate closure report
    const closureReport = await this.generateClosureReport(caseId, resolution);
    await this.caseManager.storeReport(caseId, closureReport);

    // Notify stakeholders
    await this.notifyCaseClosure(caseId, resolution);
  }

  private determineRecommendedActions(
    evidence: ComprehensiveEvidence,
    patternAnalysis: PatternAnalysis,
    relatedActivities: RelatedFraudActivity[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Account actions
    if (evidence.riskAssessment.accountTakeoverRisk > 0.8) {
      actions.push({
        type: 'suspend_account',
        priority: 'high',
        reason: 'High account takeover risk',
        evidence: ['account_takeover_indicators']
      });
    }

    // Card actions
    if (patternAnalysis.detectedPatterns.some(p => p.type === 'card_testing')) {
      actions.push({
        type: 'block_payment_method',
        priority: 'medium',
        reason: 'Card testing pattern detected',
        evidence: ['velocity_pattern', 'failure_rate']
      });
    }

    // IP actions
    if (evidence.ipIntelligence.riskScore > 0.9) {
      actions.push({
        type: 'block_ip_address',
        priority: 'high',
        reason: 'High-risk IP address',
        evidence: ['ip_reputation', 'fraud_history']
      });
    }

    // Device actions
    if (evidence.deviceIntelligence.riskScore > 0.8) {
      actions.push({
        type: 'flag_device',
        priority: 'medium',
        reason: 'Suspicious device activity',
        evidence: ['device_fingerprint_anomaly']
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}
```

This comprehensive fraud prevention system provides multi-layered protection through machine learning, behavioral analysis, real-time monitoring, and structured investigation workflows to maintain payment security and integrity for the 7P Education Platform.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Update stripe-integration-complete-guide.md with modern implementation", "status": "completed", "id": "1"}, {"content": "Create payment-flow-optimization.md", "status": "completed", "id": "2"}, {"content": "Create subscription-management.md", "status": "completed", "id": "3"}, {"content": "Create refund-dispute-handling.md", "status": "completed", "id": "4"}, {"content": "Create tax-calculation-system.md", "status": "completed", "id": "5"}, {"content": "Create multi-currency-support.md", "status": "completed", "id": "6"}, {"content": "Create payment-analytics.md", "status": "completed", "id": "7"}, {"content": "Create fraud-prevention.md", "status": "completed", "id": "8"}]