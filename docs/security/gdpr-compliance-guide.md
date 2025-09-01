# GDPR Compliance Guide - 7P Education Platform

## Executive Summary

This comprehensive GDPR (General Data Protection Regulation) compliance guide provides detailed implementation requirements, data protection measures, consent management systems, and privacy-by-design principles for the 7P Education Platform. The guide ensures full compliance with EU data protection regulations while maintaining platform functionality and user experience.

### GDPR Compliance Overview
- **Regulation Scope**: EU Regulation 2016/679
- **Territorial Scope**: EU residents and data processing activities
- **Maximum Penalties**: Up to 4% of annual global revenue or €20 million
- **Key Principles**: Lawfulness, fairness, transparency, purpose limitation, data minimization
- **Individual Rights**: 8 fundamental rights including access, rectification, erasure, portability

### Platform Compliance Status
- ✅ **Legal Basis Establishment**: Contract and legitimate interest documented
- ✅ **Privacy Policy**: Comprehensive and transparent
- ✅ **Consent Management**: Granular consent tracking system
- ✅ **Data Mapping**: Complete data inventory and flow documentation
- ⚠️ **Data Retention**: Automated policies need enhancement
- ⚠️ **Cross-Border Transfers**: Standard contractual clauses implementation pending

## 1. Legal Basis for Data Processing

### Article 6 - Lawfulness of Processing

#### Primary Legal Bases Used
```javascript
// lib/gdpr/legalBasis.js
export const legalBases = {
  CONTRACT: {
    article: '6(1)(b)',
    description: 'Processing necessary for contract performance',
    dataTypes: [
      'user_registration',
      'course_enrollment',
      'payment_processing',
      'grade_management',
      'communication_delivery'
    ],
    retention: '7 years after contract termination'
  },

  LEGITIMATE_INTEREST: {
    article: '6(1)(f)',
    description: 'Processing necessary for legitimate interests',
    dataTypes: [
      'security_monitoring',
      'fraud_prevention',
      'service_improvement',
      'academic_analytics'
    ],
    balancingTest: 'documented_assessment_required',
    retention: '3 years or until objection'
  },

  CONSENT: {
    article: '6(1)(a)',
    description: 'Explicit consent for specific purposes',
    dataTypes: [
      'marketing_communications',
      'behavioral_analytics',
      'social_features',
      'optional_data_collection'
    ],
    withdrawable: true,
    retention: 'until_consent_withdrawn'
  },

  LEGAL_OBLIGATION: {
    article: '6(1)(c)',
    description: 'Processing required by law',
    dataTypes: [
      'tax_records',
      'audit_trails',
      'regulatory_reporting'
    ],
    retention: 'as_required_by_law'
  },

  VITAL_INTERESTS: {
    article: '6(1)(d)',
    description: 'Processing necessary to protect vital interests',
    dataTypes: [
      'emergency_contact',
      'health_related_incidents'
    ],
    retention: 'until_risk_resolved'
  }
}

export class LegalBasisManager {
  static validateProcessingActivity(dataType, purpose, legalBasis) {
    const basis = legalBases[legalBasis]
    
    if (!basis) {
      throw new Error(`Invalid legal basis: ${legalBasis}`)
    }

    if (!basis.dataTypes.includes(dataType)) {
      throw new Error(`Data type ${dataType} not covered by ${legalBasis}`)
    }

    return {
      isValid: true,
      legalBasis: basis,
      retentionPeriod: basis.retention,
      requiresConsent: legalBasis === 'CONSENT'
    }
  }

  static async conductLegitimateInterestAssessment(purpose, dataTypes, risks) {
    const assessment = {
      purpose: purpose,
      necessity: await this.assessNecessity(purpose, dataTypes),
      balancing: await this.conductBalancingTest(purpose, dataTypes, risks),
      safeguards: await this.identifyRequiredSafeguards(risks),
      conclusion: null,
      assessmentDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }

    assessment.conclusion = assessment.necessity.score > 7 && 
                           assessment.balancing.score > 7 ? 'APPROVED' : 'REJECTED'

    await LegitimateInterestAssessment.create(assessment)
    return assessment
  }
}
```

### Special Category Data (Article 9)
```javascript
// lib/gdpr/specialCategories.js
export const specialCategoryHandling = {
  // Educational context - Article 9(2)(g)
  PUBLIC_INTEREST_EDUCATION: {
    legalBasis: '9(2)(g)',
    description: 'Processing for educational purposes in public interest',
    dataTypes: [
      'learning_difficulties',
      'special_educational_needs',
      'accessibility_requirements'
    ],
    safeguards: [
      'explicit_consent_required',
      'data_minimization_strict',
      'enhanced_security_measures',
      'staff_training_mandatory'
    ]
  },

  EXPLICIT_CONSENT: {
    legalBasis: '9(2)(a)',
    description: 'Explicit consent for special category data',
    requirements: [
      'clear_and_specific',
      'informed_consent',
      'freely_given',
      'documented_evidence'
    ]
  }
}

export class SpecialCategoryManager {
  static async processSpecialCategoryData(userId, dataType, value, consent) {
    // Verify explicit consent
    if (!consent?.explicit || !consent?.timestamp) {
      throw new Error('Explicit consent required for special category data')
    }

    // Enhanced encryption for special categories
    const encrypted = await DataEncryption.encryptSpecialCategory(value)
    
    // Audit trail
    await SpecialCategoryProcessingLog.create({
      userId,
      dataType,
      legalBasis: '9(2)(a)',
      consentId: consent.id,
      processedAt: new Date(),
      purpose: consent.purpose
    })

    return encrypted
  }

  static async handleSpecialCategoryRequest(userId, requestType) {
    const specialData = await User.findById(userId).select('specialCategories')
    
    switch (requestType) {
      case 'access':
        return await this.generateSpecialCategoryReport(specialData)
      case 'erasure':
        return await this.eraseSpecialCategoryData(userId)
      case 'rectification':
        return await this.rectifySpecialCategoryData(userId)
    }
  }
}
```

## 2. Privacy-by-Design Implementation

### Core Privacy Principles
```javascript
// lib/gdpr/privacyByDesign.js
export class PrivacyByDesign {
  static principles = {
    PROACTIVE: 'Anticipate and prevent privacy invasions',
    DEFAULT: 'Privacy as the default setting',
    EMBEDDED: 'Privacy embedded into design and operations',
    FULL_FUNCTIONALITY: 'Full functionality without privacy trade-offs',
    END_TO_END: 'Secure data lifecycle management',
    VISIBILITY: 'Transparency and accountability',
    RESPECT: 'Respect for user privacy and interests'
  }

  // Data Minimization Implementation
  static async implementDataMinimization(collectionSchema, purpose) {
    const minimizedSchema = {}
    
    for (const [field, config] of Object.entries(collectionSchema)) {
      const necessity = await this.assessFieldNecessity(field, purpose)
      
      if (necessity.required) {
        minimizedSchema[field] = {
          ...config,
          purpose: necessity.purpose,
          retention: necessity.retention,
          minimizationApplied: true
        }
      }
    }

    return minimizedSchema
  }

  // Privacy by Default Configuration
  static getDefaultPrivacySettings() {
    return {
      // Communication preferences - opt-in required
      marketing: {
        email: false,
        sms: false,
        push: false,
        postal: false
      },
      
      // Data processing - minimal by default
      analytics: {
        behavioral: false,
        performance: true, // necessary for service
        advertising: false,
        crossSite: false
      },
      
      // Profile visibility - restricted by default
      profile: {
        visibility: 'private',
        searchable: false,
        showProgress: false,
        showActivity: false
      },
      
      // Data sharing - disabled by default
      sharing: {
        thirdParty: false,
        research: false,
        marketing: false,
        publicDirectory: false
      }
    }
  }

  // Purpose Limitation Enforcement
  static async enforcePurposeLimitation(dataType, currentPurpose, newPurpose) {
    const compatibility = await this.assessPurposeCompatibility(currentPurpose, newPurpose)
    
    if (!compatibility.compatible) {
      if (compatibility.requiresConsent) {
        throw new ConsentRequiredError(`New purpose requires explicit consent: ${newPurpose}`)
      } else {
        throw new PurposeIncompatibleError(`Purpose ${newPurpose} incompatible with ${currentPurpose}`)
      }
    }

    // Log purpose change
    await PurposeChangeLog.create({
      dataType,
      oldPurpose: currentPurpose,
      newPurpose,
      compatibility: compatibility.score,
      timestamp: new Date()
    })

    return compatibility
  }
}
```

### Data Protection Impact Assessment (DPIA)
```javascript
// lib/gdpr/dpia.js
export class DataProtectionImpactAssessment {
  static async conductDPIA(processingActivity) {
    const dpia = {
      activity: processingActivity,
      necessity: await this.assessNecessity(processingActivity),
      risks: await this.identifyRisks(processingActivity),
      measures: await this.identifySafeguards(processingActivity),
      residualRisks: null,
      consultation: null,
      decision: null,
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }

    dpia.residualRisks = await this.calculateResidualRisks(dpia.risks, dpia.measures)
    
    // High-risk activities require DPO consultation
    if (dpia.residualRisks.level === 'HIGH') {
      dpia.consultation = await this.consultDataProtectionOfficer(dpia)
    }

    dpia.decision = this.makeProcessingDecision(dpia)
    
    await DPIA.create(dpia)
    return dpia
  }

  static riskAssessmentCriteria = {
    SYSTEMATIC_MONITORING: { weight: 3, description: 'Large scale systematic monitoring' },
    SPECIAL_CATEGORIES: { weight: 4, description: 'Processing special category data' },
    VULNERABLE_SUBJECTS: { weight: 3, description: 'Processing data of children/vulnerable adults' },
    LARGE_SCALE: { weight: 2, description: 'Large scale processing operations' },
    AUTOMATED_DECISIONS: { weight: 3, description: 'Automated decision-making with legal effects' },
    DATA_MATCHING: { weight: 2, description: 'Matching data from multiple sources' },
    INNOVATIVE_TECHNOLOGY: { weight: 2, description: 'Use of new/innovative technologies' },
    PUBLIC_ACCESS_PREVENTION: { weight: 1, description: 'Preventing data subjects from exercising rights' }
  }

  static async identifyRisks(processingActivity) {
    const identifiedRisks = []
    
    for (const [criterion, config] of Object.entries(this.riskAssessmentCriteria)) {
      if (await this.criterionApplies(processingActivity, criterion)) {
        identifiedRisks.push({
          criterion,
          weight: config.weight,
          description: config.description,
          likelihood: await this.assessLikelihood(processingActivity, criterion),
          impact: await this.assessImpact(processingActivity, criterion)
        })
      }
    }

    return identifiedRisks
  }
}
```

## 3. Consent Management System

### Granular Consent Implementation
```javascript
// lib/gdpr/consentManagement.js
export class ConsentManager {
  static consentCategories = {
    NECESSARY: {
      id: 'necessary',
      name: 'Strictly Necessary',
      description: 'Essential for platform functionality',
      required: true,
      withdrawable: false,
      purposes: ['authentication', 'security', 'course_delivery']
    },
    FUNCTIONAL: {
      id: 'functional',
      name: 'Functional',
      description: 'Enhanced user experience features',
      required: false,
      withdrawable: true,
      purposes: ['preferences', 'language_settings', 'accessibility']
    },
    ANALYTICS: {
      id: 'analytics',
      name: 'Analytics',
      description: 'Usage analysis and improvement',
      required: false,
      withdrawable: true,
      purposes: ['performance_monitoring', 'usage_analytics', 'service_improvement']
    },
    MARKETING: {
      id: 'marketing',
      name: 'Marketing',
      description: 'Promotional communications',
      required: false,
      withdrawable: true,
      purposes: ['email_marketing', 'personalized_offers', 'surveys']
    }
  }

  static async recordConsent(userId, consentData) {
    const consentRecord = {
      userId,
      timestamp: new Date(),
      version: '1.2', // Privacy policy version
      consents: {},
      metadata: {
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        source: consentData.source, // 'registration', 'settings', 'popup'
        method: consentData.method // 'explicit', 'implied'
      }
    }

    // Validate and record each consent category
    for (const [categoryId, status] of Object.entries(consentData.consents)) {
      const category = this.consentCategories[categoryId.toUpperCase()]
      
      if (!category) {
        throw new Error(`Invalid consent category: ${categoryId}`)
      }

      // Required consents must be true
      if (category.required && !status) {
        throw new Error(`Consent required for category: ${categoryId}`)
      }

      consentRecord.consents[categoryId] = {
        granted: status,
        timestamp: new Date(),
        withdrawable: category.withdrawable,
        purposes: category.purposes
      }
    }

    // Save consent record
    await Consent.create(consentRecord)

    // Update user preferences
    await this.updateUserPreferences(userId, consentRecord.consents)

    // Log consent event
    await ConsentLog.create({
      userId,
      action: 'consent_given',
      categories: Object.keys(consentRecord.consents),
      timestamp: new Date()
    })

    return consentRecord
  }

  static async withdrawConsent(userId, categories) {
    const user = await User.findById(userId)
    const currentConsent = await Consent.findOne({ userId }).sort({ timestamp: -1 })

    if (!currentConsent) {
      throw new Error('No consent record found')
    }

    const updatedConsents = { ...currentConsent.consents }

    for (const categoryId of categories) {
      const category = this.consentCategories[categoryId.toUpperCase()]
      
      if (!category) {
        throw new Error(`Invalid consent category: ${categoryId}`)
      }

      if (!category.withdrawable) {
        throw new Error(`Consent not withdrawable for category: ${categoryId}`)
      }

      updatedConsents[categoryId] = {
        ...updatedConsents[categoryId],
        granted: false,
        withdrawnAt: new Date(),
        withdrawalMethod: 'user_request'
      }
    }

    // Create new consent record
    const newConsentRecord = {
      userId,
      timestamp: new Date(),
      version: currentConsent.version,
      consents: updatedConsents,
      metadata: {
        source: 'withdrawal',
        previousConsentId: currentConsent._id
      }
    }

    await Consent.create(newConsentRecord)

    // Update user preferences
    await this.updateUserPreferences(userId, updatedConsents)

    // Process data deletion if required
    await this.processConsentWithdrawal(userId, categories)

    // Log withdrawal
    await ConsentLog.create({
      userId,
      action: 'consent_withdrawn',
      categories,
      timestamp: new Date()
    })

    return newConsentRecord
  }

  // Consent validation for data processing
  static async validateConsent(userId, purpose) {
    const latestConsent = await Consent.findOne({ userId }).sort({ timestamp: -1 })
    
    if (!latestConsent) {
      throw new Error('No consent record found')
    }

    // Find which consent category covers this purpose
    const relevantCategory = Object.values(this.consentCategories).find(category =>
      category.purposes.includes(purpose)
    )

    if (!relevantCategory) {
      throw new Error(`No consent category found for purpose: ${purpose}`)
    }

    const consent = latestConsent.consents[relevantCategory.id]
    
    if (!consent || !consent.granted) {
      throw new ConsentError(`Consent not granted for purpose: ${purpose}`)
    }

    // Check if consent is still valid (not expired)
    const consentAge = Date.now() - new Date(consent.timestamp).getTime()
    const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year

    if (consentAge > maxAge) {
      throw new ConsentExpiredError(`Consent expired for purpose: ${purpose}`)
    }

    return {
      valid: true,
      consent: consent,
      category: relevantCategory
    }
  }
}
```

### Consent Interface Implementation
```javascript
// components/ConsentManager.jsx
import { useState, useEffect } from 'react'
import { ConsentAPI } from '../lib/api/consent'

export default function ConsentManager({ userId, onConsentUpdate }) {
  const [consents, setConsents] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadCurrentConsents()
  }, [userId])

  const loadCurrentConsents = async () => {
    try {
      const currentConsents = await ConsentAPI.getCurrentConsents(userId)
      setConsents(currentConsents)
    } catch (error) {
      console.error('Failed to load consents:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConsent = async (categoryId, granted) => {
    setUpdating(true)
    try {
      const updatedConsents = { ...consents, [categoryId]: granted }
      await ConsentAPI.updateConsent(userId, { [categoryId]: granted })
      setConsents(updatedConsents)
      onConsentUpdate?.(updatedConsents)
    } catch (error) {
      console.error('Failed to update consent:', error)
      // Revert UI state
      setConsents(prevConsents => prevConsents)
    } finally {
      setUpdating(false)
    }
  }

  const withdrawAllConsents = async () => {
    if (!confirm('Are you sure you want to withdraw all consents? This may limit platform functionality.')) {
      return
    }

    setUpdating(true)
    try {
      const withdrawableCategories = Object.keys(ConsentManager.consentCategories)
        .filter(key => ConsentManager.consentCategories[key].withdrawable)
      
      await ConsentAPI.withdrawConsent(userId, withdrawableCategories)
      await loadCurrentConsents()
    } catch (error) {
      console.error('Failed to withdraw consents:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="consent-loading">Loading consent preferences...</div>
  }

  return (
    <div className="consent-manager">
      <div className="consent-header">
        <h2>Privacy Preferences</h2>
        <p>Manage your data processing consents. You can change these settings at any time.</p>
      </div>

      <div className="consent-categories">
        {Object.entries(ConsentManager.consentCategories).map(([key, category]) => (
          <div key={key} className={`consent-category ${category.required ? 'required' : ''}`}>
            <div className="category-header">
              <h3>{category.name}</h3>
              {category.required && <span className="required-badge">Required</span>}
            </div>
            
            <p className="category-description">{category.description}</p>
            
            <div className="category-purposes">
              <strong>Used for:</strong>
              <ul>
                {category.purposes.map(purpose => (
                  <li key={purpose}>{purpose.replace('_', ' ')}</li>
                ))}
              </ul>
            </div>

            <div className="consent-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={consents[key] || false}
                  onChange={(e) => updateConsent(key, e.target.checked)}
                  disabled={category.required || updating}
                />
                <span className="slider"></span>
              </label>
              <span className="toggle-label">
                {consents[key] ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="consent-actions">
        <button
          onClick={withdrawAllConsents}
          className="btn-secondary"
          disabled={updating}
        >
          Withdraw All Optional Consents
        </button>
        
        <button
          onClick={() => window.open('/privacy-policy', '_blank')}
          className="btn-link"
        >
          View Privacy Policy
        </button>
      </div>

      <div className="consent-history">
        <details>
          <summary>Consent History</summary>
          <ConsentHistory userId={userId} />
        </details>
      </div>
    </div>
  )
}
```

## 4. Data Subject Rights Implementation

### Right to Access (Article 15)
```javascript
// lib/gdpr/dataSubjectRights.js
export class DataSubjectRights {
  static async processAccessRequest(userId, requestId) {
    const accessRequest = {
      requestId,
      userId,
      requestType: 'access',
      status: 'processing',
      requestDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      data: {}
    }

    try {
      // Compile personal data from all sources
      accessRequest.data = {
        personalInformation: await this.getPersonalInformation(userId),
        academicRecords: await this.getAcademicRecords(userId),
        communicationRecords: await this.getCommunicationRecords(userId),
        systemLogs: await this.getSystemLogs(userId),
        consentHistory: await this.getConsentHistory(userId),
        processingActivities: await this.getProcessingActivities(userId),
        dataRetentionSchedule: await this.getRetentionSchedule(userId),
        thirdPartySharing: await this.getThirdPartySharing(userId)
      }

      // Generate structured export
      const exportData = await this.generateStructuredExport(accessRequest.data)
      
      // Create downloadable format
      const exportFile = await this.createDownloadableExport(exportData, userId)

      accessRequest.status = 'completed'
      accessRequest.completionDate = new Date()
      accessRequest.exportUrl = exportFile.url
      accessRequest.exportFormat = 'JSON'

      await DataSubjectRequest.create(accessRequest)

      // Notify user of completion
      await this.notifyRequestCompletion(userId, accessRequest)

      return accessRequest
    } catch (error) {
      accessRequest.status = 'failed'
      accessRequest.error = error.message
      await DataSubjectRequest.create(accessRequest)
      throw error
    }
  }

  static async getPersonalInformation(userId) {
    const user = await User.findById(userId).lean()
    const profile = await UserProfile.findOne({ userId }).lean()

    return {
      basic: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        registrationDate: user.createdAt,
        lastLogin: user.lastLoginAt,
        accountStatus: user.status,
        role: user.role
      },
      profile: profile ? {
        bio: profile.bio,
        location: profile.location,
        timezone: profile.timezone,
        language: profile.language,
        preferences: profile.preferences
      } : null,
      verification: {
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        identityVerified: user.identityVerified
      }
    }
  }

  static async getAcademicRecords(userId) {
    const courses = await Course.find({ participants: userId }).lean()
    const progress = await Progress.find({ userId }).lean()
    const assignments = await Assignment.find({ studentId: userId }).lean()
    const grades = await Grade.find({ studentId: userId }).lean()
    const certificates = await Certificate.find({ userId }).lean()

    return {
      enrolledCourses: courses.map(course => ({
        id: course._id,
        title: course.title,
        enrollmentDate: course.enrollmentDate,
        completionDate: course.completionDate,
        status: course.status
      })),
      progressRecords: progress.map(p => ({
        courseId: p.courseId,
        completionPercentage: p.completionPercentage,
        timeSpent: p.timeSpent,
        lastAccessed: p.lastAccessed
      })),
      assignments: assignments.map(a => ({
        id: a._id,
        title: a.title,
        submissionDate: a.submissionDate,
        grade: a.grade,
        feedback: a.feedback
      })),
      grades: grades.map(g => ({
        courseId: g.courseId,
        assignmentId: g.assignmentId,
        score: g.score,
        maxScore: g.maxScore,
        gradedDate: g.gradedDate
      })),
      certificates: certificates.map(c => ({
        id: c._id,
        courseId: c.courseId,
        issuedDate: c.issuedDate,
        certificateUrl: c.url
      }))
    }
  }
}
```

### Right to Rectification (Article 16)
```javascript
export class RectificationHandler {
  static async processRectificationRequest(userId, corrections, requestId) {
    const rectificationRequest = {
      requestId,
      userId,
      requestType: 'rectification',
      status: 'processing',
      corrections,
      requestDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    try {
      // Validate corrections
      const validatedCorrections = await this.validateCorrections(corrections, userId)
      
      // Apply corrections with audit trail
      const updateResults = await this.applyCorrections(userId, validatedCorrections)
      
      // Notify third parties of corrections if shared
      await this.notifyThirdParties(userId, validatedCorrections)
      
      rectificationRequest.status = 'completed'
      rectificationRequest.completionDate = new Date()
      rectificationRequest.updateResults = updateResults
      
      await DataSubjectRequest.create(rectificationRequest)
      
      // Log rectification activity
      await this.logRectificationActivity(userId, validatedCorrections)
      
      return rectificationRequest
    } catch (error) {
      rectificationRequest.status = 'failed'
      rectificationRequest.error = error.message
      await DataSubjectRequest.create(rectificationRequest)
      throw error
    }
  }

  static async validateCorrections(corrections, userId) {
    const validated = {}
    
    for (const [field, newValue] of Object.entries(corrections)) {
      // Check if field is rectifiable
      if (!this.isRectifiableField(field)) {
        throw new Error(`Field ${field} is not rectifiable`)
      }
      
      // Validate new value format
      const validation = await this.validateFieldValue(field, newValue)
      if (!validation.isValid) {
        throw new Error(`Invalid value for ${field}: ${validation.error}`)
      }
      
      // Check user authorization for field
      const hasPermission = await this.checkRectificationPermission(userId, field)
      if (!hasPermission) {
        throw new Error(`User not authorized to rectify ${field}`)
      }
      
      validated[field] = newValue
    }
    
    return validated
  }

  static rectifiableFields = {
    'personalInfo.name': { validator: 'name', requiresVerification: false },
    'personalInfo.email': { validator: 'email', requiresVerification: true },
    'personalInfo.phone': { validator: 'phone', requiresVerification: true },
    'personalInfo.address': { validator: 'address', requiresVerification: false },
    'profile.bio': { validator: 'text', requiresVerification: false },
    'profile.preferences': { validator: 'object', requiresVerification: false },
    'academic.emergencyContact': { validator: 'contact', requiresVerification: true }
  }

  static async applyCorrections(userId, corrections) {
    const updateResults = []
    const session = await mongoose.startSession()
    
    try {
      await session.withTransaction(async () => {
        for (const [fieldPath, newValue] of Object.entries(corrections)) {
          const [collection, field] = fieldPath.split('.')
          
          let updateResult
          switch (collection) {
            case 'personalInfo':
              updateResult = await User.updateOne(
                { _id: userId },
                { $set: { [field]: newValue } },
                { session }
              )
              break
              
            case 'profile':
              updateResult = await UserProfile.updateOne(
                { userId },
                { $set: { [field]: newValue } },
                { session }
              )
              break
              
            case 'academic':
              updateResult = await AcademicProfile.updateOne(
                { userId },
                { $set: { [field]: newValue } },
                { session }
              )
              break
          }
          
          updateResults.push({
            field: fieldPath,
            oldValue: await this.getOldValue(userId, fieldPath),
            newValue,
            updateResult,
            timestamp: new Date()
          })
        }
      })
      
      return updateResults
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }
}
```

### Right to Erasure (Article 17)
```javascript
export class ErasureHandler {
  static async processErasureRequest(userId, reason, requestId) {
    const erasureRequest = {
      requestId,
      userId,
      requestType: 'erasure',
      reason,
      status: 'processing',
      requestDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    try {
      // Assess erasure eligibility
      const eligibilityAssessment = await this.assessErasureEligibility(userId, reason)
      
      if (!eligibilityAssessment.eligible) {
        erasureRequest.status = 'rejected'
        erasureRequest.rejectionReason = eligibilityAssessment.reason
        await DataSubjectRequest.create(erasureRequest)
        return erasureRequest
      }

      // Determine erasure scope
      const erasureScope = await this.determineErasureScope(userId, reason)
      
      // Execute erasure process
      const erasureResults = await this.executeErasure(userId, erasureScope)
      
      erasureRequest.status = 'completed'
      erasureRequest.completionDate = new Date()
      erasureRequest.erasureScope = erasureScope
      erasureRequest.erasureResults = erasureResults
      
      await DataSubjectRequest.create(erasureRequest)
      
      return erasureRequest
    } catch (error) {
      erasureRequest.status = 'failed'
      erasureRequest.error = error.message
      await DataSubjectRequest.create(erasureRequest)
      throw error
    }
  }

  static async assessErasureEligibility(userId, reason) {
    const user = await User.findById(userId)
    const activeContracts = await Contract.find({ userId, status: 'active' })
    const legalObligations = await this.checkLegalObligations(userId)
    const vitalInterests = await this.checkVitalInterests(userId)

    // Article 17(3) exceptions
    const exceptions = []

    // Freedom of expression and information
    if (await this.hasPublicInterestContent(userId)) {
      exceptions.push('freedom_of_expression')
    }

    // Compliance with legal obligations
    if (legalObligations.length > 0) {
      exceptions.push('legal_obligation')
    }

    // Public interest tasks
    if (await this.hasPublicInterestTasks(userId)) {
      exceptions.push('public_interest')
    }

    // Active contracts
    if (activeContracts.length > 0) {
      exceptions.push('active_contract')
    }

    // Scientific/historical research
    if (await this.hasResearchValue(userId)) {
      exceptions.push('research_value')
    }

    const eligible = exceptions.length === 0 || reason === 'consent_withdrawn'

    return {
      eligible,
      reason: eligible ? null : `Erasure prevented by: ${exceptions.join(', ')}`,
      exceptions,
      assessmentDate: new Date()
    }
  }

  static async executeErasure(userId, scope) {
    const results = []
    const session = await mongoose.startSession()

    try {
      await session.withTransaction(async () => {
        // User profile erasure/anonymization
        if (scope.includes('profile')) {
          const anonymizedData = this.generateAnonymizedProfile(userId)
          await User.updateOne(
            { _id: userId },
            { $set: anonymizedData },
            { session }
          )
          results.push({ collection: 'users', action: 'anonymized' })
        }

        // Academic records handling
        if (scope.includes('academic')) {
          // Keep academic records but anonymize personal identifiers
          await this.anonymizeAcademicRecords(userId, session)
          results.push({ collection: 'academic', action: 'anonymized' })
        }

        // Communication records
        if (scope.includes('communications')) {
          await Message.deleteMany({ $or: [{ from: userId }, { to: userId }] }, { session })
          await Notification.deleteMany({ userId }, { session })
          results.push({ collection: 'communications', action: 'deleted' })
        }

        // System logs (retain security logs for legal obligations)
        if (scope.includes('logs')) {
          await ActivityLog.deleteMany({ 
            userId, 
            type: { $nin: ['security', 'audit'] } 
          }, { session })
          results.push({ collection: 'logs', action: 'partial_deletion' })
        }

        // Consent records (anonymize but retain for compliance)
        if (scope.includes('consents')) {
          await this.anonymizeConsentRecords(userId, session)
          results.push({ collection: 'consents', action: 'anonymized' })
        }

        // Third-party erasure notifications
        await this.notifyThirdPartyErasure(userId)
      })

      return results
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  static generateAnonymizedProfile(userId) {
    const anonymousId = `anon_${crypto.randomBytes(8).toString('hex')}`
    
    return {
      name: 'Anonymized User',
      email: `${anonymousId}@anonymized.local`,
      isAnonymized: true,
      anonymizedAt: new Date(),
      originalId: userId,
      $unset: {
        phone: 1,
        dateOfBirth: 1,
        address: 1,
        profilePicture: 1,
        emergencyContact: 1,
        personalDetails: 1
      }
    }
  }
}
```

## 5. Data Transfers and International Compliance

### Standard Contractual Clauses (SCCs)
```javascript
// lib/gdpr/internationalTransfers.js
export class InternationalTransfers {
  static adequacyDecisions = [
    'Andorra', 'Argentina', 'Canada', 'Faroe Islands', 'Guernsey', 'Israel',
    'Isle of Man', 'Japan', 'Jersey', 'New Zealand', 'Switzerland', 'Uruguay',
    'United Kingdom', 'South Korea'
  ]

  static async validateTransfer(recipientCountry, transferType, dataCategories) {
    const validation = {
      country: recipientCountry,
      transferType,
      dataCategories,
      validationDate: new Date(),
      approved: false,
      mechanism: null,
      additionalSafeguards: []
    }

    // Check adequacy decision
    if (this.adequacyDecisions.includes(recipientCountry)) {
      validation.approved = true
      validation.mechanism = 'adequacy_decision'
      return validation
    }

    // Require appropriate safeguards
    switch (transferType) {
      case 'processor':
        validation.mechanism = 'standard_contractual_clauses'
        validation.approved = true
        validation.additionalSafeguards = await this.getProcessorSafeguards(dataCategories)
        break

      case 'controller':
        validation.mechanism = 'standard_contractual_clauses'
        validation.approved = true
        validation.additionalSafeguards = await this.getControllerSafeguards(dataCategories)
        break

      case 'one_time':
        validation.mechanism = 'specific_authorization'
        validation.approved = await this.assessSpecificAuthorization(recipientCountry, dataCategories)
        break

      default:
        validation.approved = false
        validation.reason = 'Unknown transfer type'
    }

    // Log transfer validation
    await TransferValidation.create(validation)

    return validation
  }

  static async implementSCCs(recipientEntity, contractType) {
    const sccImplementation = {
      recipientEntity,
      contractType, // 'controller-controller' or 'controller-processor'
      sccVersion: '2021', // Latest EU SCC version
      implementationDate: new Date(),
      clauses: await this.generateSCCClauses(contractType),
      technicalMeasures: await this.defineTechnicalMeasures(),
      organizationalMeasures: await this.defineOrganizationalMeasures(),
      monitoringRequirements: await this.defineMonitoringRequirements()
    }

    await StandardContractualClauses.create(sccImplementation)
    return sccImplementation
  }

  static async monitorTransferCompliance() {
    const activeTransfers = await DataTransfer.find({ status: 'active' })
    const complianceReport = {
      totalTransfers: activeTransfers.length,
      compliantTransfers: 0,
      violations: [],
      reviewDate: new Date()
    }

    for (const transfer of activeTransfers) {
      const compliance = await this.assessTransferCompliance(transfer)
      
      if (compliance.compliant) {
        complianceReport.compliantTransfers++
      } else {
        complianceReport.violations.push({
          transferId: transfer._id,
          recipient: transfer.recipient,
          violations: compliance.violations
        })
      }
    }

    return complianceReport
  }
}
```

## 6. Data Retention and Deletion

### Automated Retention Policy Implementation
```javascript
// lib/gdpr/dataRetention.js
export class DataRetentionManager {
  static retentionPolicies = {
    USER_ACCOUNTS: {
      category: 'user_accounts',
      retention: '7_years_after_deletion',
      legalBasis: 'legitimate_interest',
      triggerEvent: 'account_deletion',
      exceptions: ['legal_hold', 'ongoing_investigation']
    },
    ACADEMIC_RECORDS: {
      category: 'academic_records',
      retention: '10_years',
      legalBasis: 'legal_obligation',
      triggerEvent: 'course_completion',
      exceptions: ['student_request', 'accreditation_requirements']
    },
    COMMUNICATION_LOGS: {
      category: 'communication_logs',
      retention: '3_years',
      legalBasis: 'legitimate_interest',
      triggerEvent: 'message_sent',
      exceptions: ['complaint_investigation', 'legal_proceedings']
    },
    SYSTEM_LOGS: {
      category: 'system_logs',
      retention: '2_years',
      legalBasis: 'legitimate_interest',
      triggerEvent: 'log_creation',
      exceptions: ['security_incident', 'audit_requirements']
    },
    MARKETING_DATA: {
      category: 'marketing_data',
      retention: 'until_consent_withdrawn',
      legalBasis: 'consent',
      triggerEvent: 'consent_withdrawal',
      exceptions: []
    }
  }

  static async scheduleRetention() {
    const scheduledDeletions = []

    for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
      const candidatesForDeletion = await this.identifyDeletionCandidates(policy)
      
      for (const candidate of candidatesForDeletion) {
        // Check for exceptions
        const hasExceptions = await this.checkRetentionExceptions(candidate, policy.exceptions)
        
        if (!hasExceptions) {
          const scheduledDeletion = {
            policyName,
            recordId: candidate._id,
            recordType: candidate.collection,
            scheduledDate: this.calculateDeletionDate(candidate, policy),
            status: 'scheduled',
            reason: 'retention_policy'
          }
          
          scheduledDeletions.push(scheduledDeletion)
        }
      }
    }

    // Save scheduled deletions
    if (scheduledDeletions.length > 0) {
      await ScheduledDeletion.insertMany(scheduledDeletions)
    }

    return scheduledDeletions
  }

  static async executeDeletions() {
    const dueDeletions = await ScheduledDeletion.find({
      scheduledDate: { $lte: new Date() },
      status: 'scheduled'
    })

    const results = []

    for (const deletion of dueDeletions) {
      try {
        await this.executeRecordDeletion(deletion)
        
        // Update deletion status
        deletion.status = 'completed'
        deletion.executionDate = new Date()
        await deletion.save()
        
        results.push({
          id: deletion._id,
          status: 'success',
          recordType: deletion.recordType
        })
      } catch (error) {
        deletion.status = 'failed'
        deletion.error = error.message
        deletion.retryCount = (deletion.retryCount || 0) + 1
        await deletion.save()
        
        results.push({
          id: deletion._id,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Generate deletion report
    await this.generateDeletionReport(results)
    
    return results
  }

  static async executeRecordDeletion(deletion) {
    const session = await mongoose.startSession()
    
    try {
      await session.withTransaction(async () => {
        switch (deletion.recordType) {
          case 'User':
            await this.deleteUserRecord(deletion.recordId, session)
            break
          case 'AcademicRecord':
            await this.deleteAcademicRecord(deletion.recordId, session)
            break
          case 'Communication':
            await this.deleteCommunicationRecord(deletion.recordId, session)
            break
          case 'SystemLog':
            await this.deleteSystemLog(deletion.recordId, session)
            break
          default:
            throw new Error(`Unknown record type: ${deletion.recordType}`)
        }
        
        // Log deletion for audit trail
        await DeletionLog.create([{
          recordId: deletion.recordId,
          recordType: deletion.recordType,
          deletionReason: deletion.reason,
          deletionDate: new Date(),
          retentionPolicy: deletion.policyName
        }], { session })
      })
    } finally {
      session.endSession()
    }
  }
}

// Automated retention scheduler
const retentionScheduler = cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Starting automated data retention process...')
    
    // Schedule new deletions
    const scheduled = await DataRetentionManager.scheduleRetention()
    console.log(`Scheduled ${scheduled.length} records for deletion`)
    
    // Execute due deletions
    const executed = await DataRetentionManager.executeDeletions()
    console.log(`Executed ${executed.length} scheduled deletions`)
    
  } catch (error) {
    console.error('Data retention process failed:', error)
    await AlertManager.sendAlert('data_retention_failure', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})
```

## 7. Compliance Monitoring and Reporting

### GDPR Compliance Dashboard
```javascript
// lib/gdpr/complianceDashboard.js
export class GDPRComplianceDashboard {
  static async generateComplianceReport(timeframe = '30d') {
    const startDate = this.getStartDate(timeframe)
    
    const report = {
      reportPeriod: { start: startDate, end: new Date() },
      legalBasisCompliance: await this.assessLegalBasisCompliance(),
      consentManagement: await this.assessConsentCompliance(),
      dataSubjectRights: await this.assessRightsCompliance(startDate),
      dataRetention: await this.assessRetentionCompliance(),
      dataTransfers: await this.assessTransferCompliance(),
      securityMeasures: await this.assessSecurityCompliance(),
      privacyByDesign: await this.assessPrivacyByDesignCompliance(),
      overallScore: 0
    }

    // Calculate overall compliance score
    report.overallScore = this.calculateOverallScore(report)
    
    // Generate recommendations
    report.recommendations = await this.generateRecommendations(report)
    
    await ComplianceReport.create(report)
    return report
  }

  static async assessConsentCompliance() {
    const totalUsers = await User.countDocuments()
    const usersWithConsent = await Consent.distinct('userId').length
    const validConsents = await Consent.countDocuments({
      'consents.marketing.granted': true,
      'consents.marketing.withdrawable': true
    })

    return {
      consentCoverage: (usersWithConsent / totalUsers) * 100,
      validConsentRate: (validConsents / usersWithConsent) * 100,
      averageConsentAge: await this.calculateAverageConsentAge(),
      expiredConsents: await this.countExpiredConsents(),
      withdrawalRequests: await this.countConsentWithdrawals(),
      score: this.calculateConsentScore(usersWithConsent, totalUsers, validConsents)
    }
  }

  static async assessRightsCompliance(startDate) {
    const requests = await DataSubjectRequest.find({
      requestDate: { $gte: startDate }
    })

    const rightsStats = {
      totalRequests: requests.length,
      accessRequests: requests.filter(r => r.requestType === 'access').length,
      rectificationRequests: requests.filter(r => r.requestType === 'rectification').length,
      erasureRequests: requests.filter(r => r.requestType === 'erasure').length,
      portabilityRequests: requests.filter(r => r.requestType === 'portability').length,
      completedOnTime: requests.filter(r => 
        r.status === 'completed' && 
        new Date(r.completionDate) <= new Date(r.dueDate)
      ).length,
      averageResponseTime: await this.calculateAverageResponseTime(requests)
    }

    return {
      ...rightsStats,
      onTimeCompletionRate: (rightsStats.completedOnTime / rightsStats.totalRequests) * 100,
      score: this.calculateRightsScore(rightsStats)
    }
  }

  static async generateRecommendations(report) {
    const recommendations = []

    // Consent management recommendations
    if (report.consentManagement.score < 80) {
      recommendations.push({
        category: 'consent',
        priority: 'high',
        title: 'Improve Consent Management',
        description: 'Consent coverage or validity rates are below recommended thresholds',
        actions: [
          'Review consent collection processes',
          'Implement consent refresh campaigns',
          'Enhance consent UI/UX'
        ]
      })
    }

    // Rights response recommendations
    if (report.dataSubjectRights.onTimeCompletionRate < 95) {
      recommendations.push({
        category: 'rights',
        priority: 'high',
        title: 'Improve Rights Response Time',
        description: 'Data subject rights requests are not being completed within required timeframes',
        actions: [
          'Automate rights processing where possible',
          'Allocate additional resources to rights team',
          'Implement early warning system for due dates'
        ]
      })
    }

    // Data retention recommendations
    if (report.dataRetention.score < 85) {
      recommendations.push({
        category: 'retention',
        priority: 'medium',
        title: 'Enhance Data Retention Processes',
        description: 'Data retention policies may not be properly implemented or enforced',
        actions: [
          'Review and update retention schedules',
          'Implement automated deletion processes',
          'Conduct data inventory audit'
        ]
      })
    }

    return recommendations
  }
}
```

### Compliance Monitoring Automation
```javascript
// lib/gdpr/complianceMonitoring.js
export class ComplianceMonitoring {
  static monitoringChecks = [
    {
      name: 'consent_expiry',
      frequency: 'daily',
      handler: 'checkConsentExpiry'
    },
    {
      name: 'rights_request_deadlines',
      frequency: 'daily', 
      handler: 'checkRightsDeadlines'
    },
    {
      name: 'data_retention_compliance',
      frequency: 'weekly',
      handler: 'checkRetentionCompliance'
    },
    {
      name: 'transfer_compliance',
      frequency: 'monthly',
      handler: 'checkTransferCompliance'
    }
  ]

  static async runComplianceChecks() {
    const results = []
    
    for (const check of this.monitoringChecks) {
      try {
        const result = await this[check.handler]()
        results.push({
          check: check.name,
          status: 'completed',
          result,
          timestamp: new Date()
        })
      } catch (error) {
        results.push({
          check: check.name,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        })
      }
    }

    // Log monitoring results
    await ComplianceMonitoringLog.create({
      runDate: new Date(),
      results
    })

    // Send alerts for failures
    const failures = results.filter(r => r.status === 'failed')
    if (failures.length > 0) {
      await this.sendComplianceAlerts(failures)
    }

    return results
  }

  static async checkConsentExpiry() {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const expiredConsents = await Consent.find({
      timestamp: { $lt: oneYearAgo },
      'consents.marketing.granted': true
    })

    if (expiredConsents.length > 0) {
      // Schedule consent refresh
      await this.scheduleConsentRefresh(expiredConsents)
    }

    return {
      expiredCount: expiredConsents.length,
      action: expiredConsents.length > 0 ? 'refresh_scheduled' : 'no_action_required'
    }
  }

  static async checkRightsDeadlines() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const dueSoon = await DataSubjectRequest.find({
      status: { $in: ['processing', 'pending'] },
      dueDate: { $lte: tomorrow }
    })

    if (dueSoon.length > 0) {
      await this.alertRightsTeam(dueSoon)
    }

    return {
      requestsDueSoon: dueSoon.length,
      action: dueSoon.length > 0 ? 'team_alerted' : 'no_action_required'
    }
  }
}

// Schedule compliance monitoring
const complianceMonitor = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running GDPR compliance checks...')
    const results = await ComplianceMonitoring.runComplianceChecks()
    console.log('Compliance checks completed:', results.length)
  } catch (error) {
    console.error('Compliance monitoring failed:', error)
    await AlertManager.sendAlert('compliance_monitoring_failure', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})
```

## Conclusion

This comprehensive GDPR compliance guide provides the 7P Education Platform with a robust framework for full regulatory compliance. The implementation covers all essential aspects of GDPR requirements including legal basis establishment, privacy-by-design principles, consent management, data subject rights, international transfers, data retention, and continuous compliance monitoring.

### Key Implementation Priorities:

1. **Immediate Actions (0-30 days)**:
   - Deploy consent management system
   - Implement data subject rights processing
   - Establish retention policies

2. **Medium-term Goals (30-90 days)**:
   - Automate compliance monitoring  
   - Complete DPIA assessments
   - Implement cross-border transfer safeguards

3. **Long-term Objectives (90+ days)**:
   - Continuous compliance optimization
   - Regular compliance audits
   - Staff training and awareness programs

The platform achieves GDPR compliance through systematic implementation of privacy-preserving technologies, transparent data processing practices, and robust individual rights protection mechanisms, ensuring sustainable regulatory compliance while maintaining educational service excellence.