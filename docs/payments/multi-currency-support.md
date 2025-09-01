# Multi-Currency Support Guide

## Overview

Comprehensive multi-currency payment system for 7P Education Platform, providing real-time exchange rates, currency conversion, localized pricing, and international payment processing across global markets.

## Core Architecture

### Currency System Components

```typescript
interface ICurrency {
  code: string; // ISO 4217 currency code
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isPrimary?: boolean;
  supportedRegions: string[];
  metadata: {
    majorUnit: string; // e.g., "dollar"
    minorUnit: string; // e.g., "cent"
    numericCode: number;
    displayOrder: number;
    lastUpdated: Date;
  };
}

interface IExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  inverseRate: number;
  provider: ExchangeRateProvider;
  timestamp: Date;
  validUntil: Date;
  metadata: {
    bid: number;
    ask: number;
    spread: number;
    confidence: number;
    source: string;
  };
}

interface ICurrencyConversion {
  id: string;
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  exchangeRate: number;
  conversionFee: number;
  netAmount: number;
  timestamp: Date;
  metadata: {
    rateProvider: string;
    userId?: string;
    transactionId?: string;
    purpose: ConversionPurpose;
  };
}

enum ConversionPurpose {
  PAYMENT = 'payment',
  PRICING_DISPLAY = 'pricing_display',
  REPORTING = 'reporting',
  SETTLEMENT = 'settlement',
  REFUND = 'refund'
}

enum ExchangeRateProvider {
  FIXER_IO = 'fixer_io',
  CURRENCY_API = 'currency_api',
  OPEN_EXCHANGE = 'open_exchange',
  ECB = 'ecb', // European Central Bank
  FED = 'fed', // Federal Reserve
  STRIPE = 'stripe',
  PAYPAL = 'paypal'
}
```

### Advanced Multi-Currency Engine

```typescript
import { ExchangeRateService } from './exchange-rates';
import { CurrencyValidator } from './validation';
import { LocalizationService } from './localization';

class AdvancedMultiCurrencyEngine {
  private exchangeRateService: ExchangeRateService;
  private validator: CurrencyValidator;
  private localizationService: LocalizationService;
  private conversionCache: CurrencyConversionCache;

  constructor() {
    this.exchangeRateService = new ExchangeRateService();
    this.validator = new CurrencyValidator();
    this.localizationService = new LocalizationService();
    this.conversionCache = new CurrencyConversionCache();
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    options: ConversionOptions = {}
  ): Promise<CurrencyConversionResult> {
    try {
      // Validate currencies
      await this.validator.validateCurrencyPair(fromCurrency, toCurrency);

      // Check for same currency
      if (fromCurrency === toCurrency) {
        return this.createSameCurrencyResult(amount, fromCurrency);
      }

      // Check cache for recent conversion
      const cachedResult = await this.conversionCache.get(
        amount,
        fromCurrency,
        toCurrency,
        options
      );
      
      if (cachedResult && !this.isStaleConversion(cachedResult)) {
        return cachedResult;
      }

      // Get exchange rate
      const exchangeRate = await this.exchangeRateService.getExchangeRate(
        fromCurrency,
        toCurrency,
        options.rateProvider
      );

      // Calculate conversion
      const baseConversion = amount * exchangeRate.rate;
      const conversionFee = this.calculateConversionFee(amount, fromCurrency, toCurrency, options);
      const netAmount = baseConversion - conversionFee;

      // Round to currency-specific decimal places
      const roundedAmount = this.roundToCurrencyPrecision(netAmount, toCurrency);

      const result: CurrencyConversionResult = {
        fromAmount: amount,
        fromCurrency,
        toAmount: roundedAmount,
        toCurrency,
        exchangeRate: exchangeRate.rate,
        conversionFee,
        netAmount: roundedAmount,
        timestamp: new Date(),
        rateProvider: exchangeRate.provider,
        rateTimestamp: exchangeRate.timestamp,
        metadata: {
          spread: exchangeRate.metadata.spread,
          confidence: exchangeRate.metadata.confidence,
          purpose: options.purpose || ConversionPurpose.PAYMENT
        }
      };

      // Cache result
      await this.conversionCache.set(result);

      return result;

    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw new CurrencyConversionError('Failed to convert currency', error);
    }
  }

  async getLocalizedPricing(
    basePrice: number,
    baseCurrency: string,
    targetRegion: string,
    options: LocalizedPricingOptions = {}
  ): Promise<LocalizedPrice> {
    // Get region currency preferences
    const regionCurrency = await this.localizationService.getPreferredCurrency(targetRegion);
    
    // Convert to local currency
    const conversion = await this.convertCurrency(
      basePrice,
      baseCurrency,
      regionCurrency,
      { purpose: ConversionPurpose.PRICING_DISPLAY }
    );

    // Apply psychological pricing
    const psychologicalPrice = options.applyPsychologicalPricing
      ? this.applyPsychologicalPricing(conversion.toAmount, regionCurrency)
      : conversion.toAmount;

    // Get local formatting
    const formattedPrice = await this.localizationService.formatCurrency(
      psychologicalPrice,
      regionCurrency,
      targetRegion
    );

    // Calculate price comparison
    const priceComparison = await this.calculatePriceComparison(
      psychologicalPrice,
      regionCurrency,
      targetRegion
    );

    return {
      originalPrice: basePrice,
      originalCurrency: baseCurrency,
      localPrice: psychologicalPrice,
      localCurrency: regionCurrency,
      formattedPrice,
      exchangeRate: conversion.exchangeRate,
      lastUpdated: conversion.timestamp,
      priceComparison,
      metadata: {
        psychologicalPricingApplied: options.applyPsychologicalPricing,
        region: targetRegion,
        confidence: conversion.metadata.confidence
      }
    };
  }

  private applyPsychologicalPricing(amount: number, currency: string): number {
    const rules = this.getPsychologicalPricingRules(currency);
    
    for (const rule of rules) {
      if (amount >= rule.minAmount && amount <= rule.maxAmount) {
        return this.applyPricingRule(amount, rule);
      }
    }
    
    return amount;
  }

  private applyPricingRule(amount: number, rule: PsychologicalPricingRule): number {
    switch (rule.type) {
      case 'charm_pricing':
        // Price ending in .99, .95, etc.
        return Math.floor(amount) + rule.charmDigits;
      
      case 'round_number':
        // Round to nearest significant number
        return Math.round(amount / rule.roundTo) * rule.roundTo;
      
      case 'prestige_pricing':
        // Round up for premium positioning
        return Math.ceil(amount / rule.roundTo) * rule.roundTo;
      
      default:
        return amount;
    }
  }

  async handleMultiCurrencyPayment(
    paymentRequest: MultiCurrencyPaymentRequest
  ): Promise<MultiCurrencyPaymentResult> {
    try {
      // Determine optimal currency for processing
      const processingCurrency = await this.determineOptimalProcessingCurrency(paymentRequest);
      
      // Convert if necessary
      let finalAmount = paymentRequest.amount;
      let conversionDetails: CurrencyConversionResult | null = null;
      
      if (paymentRequest.currency !== processingCurrency) {
        conversionDetails = await this.convertCurrency(
          paymentRequest.amount,
          paymentRequest.currency,
          processingCurrency,
          { purpose: ConversionPurpose.PAYMENT }
        );
        finalAmount = conversionDetails.toAmount;
      }

      // Calculate currency-specific fees
      const currencyFees = await this.calculateCurrencySpecificFees(
        finalAmount,
        processingCurrency,
        paymentRequest
      );

      // Process payment
      const paymentResult = await this.processPaymentInCurrency(
        finalAmount,
        processingCurrency,
        paymentRequest,
        currencyFees
      );

      return {
        paymentId: paymentResult.paymentId,
        originalAmount: paymentRequest.amount,
        originalCurrency: paymentRequest.currency,
        processedAmount: finalAmount,
        processedCurrency: processingCurrency,
        conversionDetails,
        currencyFees,
        totalFees: currencyFees.reduce((sum, fee) => sum + fee.amount, 0),
        status: paymentResult.status,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Multi-currency payment failed:', error);
      throw new MultiCurrencyPaymentError('Multi-currency payment processing failed', error);
    }
  }

  private async determineOptimalProcessingCurrency(
    request: MultiCurrencyPaymentRequest
  ): Promise<string> {
    // Consider multiple factors for optimal currency selection
    const factors = await Promise.all([
      this.analyzePaymentMethodCurrencySupport(request.paymentMethod),
      this.analyzeCurrencyLiquidity(request.currency),
      this.analyzeExchangeRateStability(request.currency),
      this.analyzeProcessingCosts(request.currency, request.amount),
      this.analyzeRegionalPreferences(request.customerRegion)
    ]);

    return this.selectOptimalCurrency(factors, request.currency);
  }

  private async calculateCurrencySpecificFees(
    amount: number,
    currency: string,
    request: MultiCurrencyPaymentRequest
  ): Promise<CurrencyFee[]> {
    const fees: CurrencyFee[] = [];

    // Currency conversion fee
    if (request.currency !== currency) {
      const conversionFeeRate = await this.getConversionFeeRate(request.currency, currency);
      fees.push({
        type: 'conversion',
        amount: amount * conversionFeeRate,
        rate: conversionFeeRate,
        description: `Currency conversion from ${request.currency} to ${currency}`
      });
    }

    // Cross-border processing fee
    if (await this.isCrossBorderTransaction(request)) {
      const crossBorderFee = await this.getCrossBorderFee(currency, amount);
      fees.push({
        type: 'cross_border',
        amount: crossBorderFee,
        description: 'Cross-border transaction processing fee'
      });
    }

    // Currency risk premium
    const riskPremium = await this.calculateCurrencyRiskPremium(currency, amount);
    if (riskPremium > 0) {
      fees.push({
        type: 'currency_risk',
        amount: riskPremium,
        description: 'Currency volatility risk premium'
      });
    }

    return fees;
  }
}
```

## Real-Time Exchange Rate Management

### Exchange Rate Service Architecture

```typescript
class ExchangeRateService {
  private rateProviders: Map<ExchangeRateProvider, RateProviderInterface>;
  private rateCache: ExchangeRateCache;
  private fallbackChain: ExchangeRateProvider[];
  private validator: RateValidator;

  constructor() {
    this.rateProviders = new Map([
      [ExchangeRateProvider.FIXER_IO, new FixerIOProvider()],
      [ExchangeRateProvider.CURRENCY_API, new CurrencyAPIProvider()],
      [ExchangeRateProvider.OPEN_EXCHANGE, new OpenExchangeProvider()],
      [ExchangeRateProvider.ECB, new ECBProvider()],
      [ExchangeRateProvider.STRIPE, new StripeRateProvider()]
    ]);
    
    this.fallbackChain = [
      ExchangeRateProvider.FIXER_IO,
      ExchangeRateProvider.OPEN_EXCHANGE,
      ExchangeRateProvider.ECB,
      ExchangeRateProvider.CURRENCY_API
    ];
    
    this.rateCache = new ExchangeRateCache();
    this.validator = new RateValidator();
  }

  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    preferredProvider?: ExchangeRateProvider
  ): Promise<IExchangeRate> {
    try {
      // Check cache first
      const cachedRate = await this.rateCache.get(fromCurrency, toCurrency);
      if (cachedRate && this.isRateValid(cachedRate)) {
        return cachedRate;
      }

      // Try preferred provider first
      if (preferredProvider) {
        try {
          const rate = await this.fetchRateFromProvider(
            fromCurrency,
            toCurrency,
            preferredProvider
          );
          
          if (await this.validator.validateRate(rate)) {
            await this.rateCache.set(rate);
            return rate;
          }
        } catch (error) {
          console.warn(`Preferred provider ${preferredProvider} failed:`, error);
        }
      }

      // Try fallback providers
      for (const provider of this.fallbackChain) {
        try {
          const rate = await this.fetchRateFromProvider(
            fromCurrency,
            toCurrency,
            provider
          );
          
          if (await this.validator.validateRate(rate)) {
            await this.rateCache.set(rate);
            return rate;
          }
        } catch (error) {
          console.warn(`Provider ${provider} failed:`, error);
        }
      }

      throw new ExchangeRateError('All exchange rate providers failed');

    } catch (error) {
      console.error('Exchange rate retrieval failed:', error);
      throw new ExchangeRateError('Failed to get exchange rate', error);
    }
  }

  private async fetchRateFromProvider(
    fromCurrency: string,
    toCurrency: string,
    provider: ExchangeRateProvider
  ): Promise<IExchangeRate> {
    const providerInstance = this.rateProviders.get(provider);
    if (!providerInstance) {
      throw new ExchangeRateError(`Provider ${provider} not configured`);
    }

    const rate = await providerInstance.getRate(fromCurrency, toCurrency);
    
    return {
      id: generateRateId(),
      fromCurrency,
      toCurrency,
      rate: rate.rate,
      inverseRate: 1 / rate.rate,
      provider,
      timestamp: new Date(),
      validUntil: this.calculateValidUntil(provider, fromCurrency, toCurrency),
      metadata: {
        bid: rate.bid,
        ask: rate.ask,
        spread: rate.ask - rate.bid,
        confidence: rate.confidence || 0.95,
        source: rate.source
      }
    };
  }

  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily' = 'daily'
  ): Promise<HistoricalExchangeRate[]> {
    const provider = this.selectBestHistoricalProvider(fromCurrency, toCurrency);
    const providerInstance = this.rateProviders.get(provider);
    
    if (!providerInstance?.getHistoricalRates) {
      throw new ExchangeRateError('Historical rates not supported by available providers');
    }

    const rates = await providerInstance.getHistoricalRates(
      fromCurrency,
      toCurrency,
      startDate,
      endDate,
      interval
    );

    // Validate and enrich historical data
    return rates.map(rate => ({
      ...rate,
      volatility: this.calculateVolatility(rate, rates),
      trend: this.calculateTrend(rate, rates),
      confidence: this.calculateHistoricalConfidence(rate)
    }));
  }

  async subscribeToRateUpdates(
    currencies: string[],
    callback: (updates: ExchangeRateUpdate[]) => void
  ): Promise<RateSubscription> {
    const subscription = new RateSubscription(currencies, callback);
    
    // Set up real-time updates for supported providers
    for (const [provider, instance] of this.rateProviders) {
      if (instance.supportsRealTimeUpdates) {
        await instance.subscribeToUpdates(currencies, (updates) => {
          this.handleRealTimeUpdates(updates, subscription);
        });
      }
    }

    // Fallback to polling for providers without real-time support
    this.setupPollingForSubscription(subscription);
    
    return subscription;
  }

  private async handleRealTimeUpdates(
    updates: RawRateUpdate[],
    subscription: RateSubscription
  ): Promise<void> {
    const validatedUpdates: ExchangeRateUpdate[] = [];
    
    for (const update of updates) {
      // Validate update
      if (await this.validator.validateRateUpdate(update)) {
        // Update cache
        await this.rateCache.updateRate(update);
        
        // Add to validated updates
        validatedUpdates.push({
          fromCurrency: update.fromCurrency,
          toCurrency: update.toCurrency,
          oldRate: update.previousRate,
          newRate: update.newRate,
          change: update.newRate - update.previousRate,
          changePercent: ((update.newRate - update.previousRate) / update.previousRate) * 100,
          timestamp: update.timestamp,
          provider: update.provider
        });
      }
    }
    
    // Notify subscribers
    if (validatedUpdates.length > 0) {
      subscription.callback(validatedUpdates);
    }
  }

  async analyzeExchangeRateVolatility(
    fromCurrency: string,
    toCurrency: string,
    period: number = 30 // days
  ): Promise<VolatilityAnalysis> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (period * 24 * 60 * 60 * 1000));
    
    const historicalRates = await this.getHistoricalRates(
      fromCurrency,
      toCurrency,
      startDate,
      endDate,
      'daily'
    );

    const volatility = this.calculateStandardDeviation(
      historicalRates.map(r => r.rate)
    );

    const minRate = Math.min(...historicalRates.map(r => r.rate));
    const maxRate = Math.max(...historicalRates.map(r => r.rate));
    const averageRate = historicalRates.reduce((sum, r) => sum + r.rate, 0) / historicalRates.length;

    return {
      currencyPair: `${fromCurrency}/${toCurrency}`,
      period,
      volatility,
      averageRate,
      minRate,
      maxRate,
      priceRange: maxRate - minRate,
      priceRangePercent: ((maxRate - minRate) / averageRate) * 100,
      riskLevel: this.categorizeVolatilityRisk(volatility),
      recommendation: this.generateVolatilityRecommendation(volatility)
    };
  }
}
```

### Advanced Rate Provider Implementation

```typescript
class FixerIOProvider implements RateProviderInterface {
  private apiKey: string;
  private baseUrl: string = 'https://api.fixer.io/v1';
  private httpClient: HttpClient;

  constructor() {
    this.apiKey = process.env.FIXER_IO_API_KEY!;
    this.httpClient = new HttpClient({
      timeout: 5000,
      retries: 3
    });
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<RawExchangeRate> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/latest`, {
        params: {
          access_key: this.apiKey,
          base: fromCurrency,
          symbols: toCurrency
        }
      });

      if (!response.data.success) {
        throw new ProviderError(`Fixer.io API error: ${response.data.error.info}`);
      }

      const rate = response.data.rates[toCurrency];
      
      return {
        rate,
        bid: rate * 0.999, // Approximate bid with small spread
        ask: rate * 1.001, // Approximate ask with small spread
        timestamp: new Date(response.data.timestamp * 1000),
        source: 'fixer.io',
        confidence: 0.95
      };

    } catch (error) {
      console.error('Fixer.io rate fetch failed:', error);
      throw new ProviderError('Failed to fetch rate from Fixer.io', error);
    }
  }

  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date,
    interval: 'daily' = 'daily'
  ): Promise<HistoricalExchangeRate[]> {
    const rates: HistoricalExchangeRate[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      try {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const response = await this.httpClient.get(`${this.baseUrl}/${dateStr}`, {
          params: {
            access_key: this.apiKey,
            base: fromCurrency,
            symbols: toCurrency
          }
        });

        if (response.data.success && response.data.rates[toCurrency]) {
          rates.push({
            date: new Date(dateStr),
            rate: response.data.rates[toCurrency],
            open: response.data.rates[toCurrency],
            high: response.data.rates[toCurrency],
            low: response.data.rates[toCurrency],
            close: response.data.rates[toCurrency]
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Rate limiting
        await this.delay(100);

      } catch (error) {
        console.warn(`Failed to fetch historical rate for ${dateStr}:`, error);
      }
    }

    return rates;
  }

  supportsRealTimeUpdates(): boolean {
    return false; // Fixer.io doesn't support WebSocket updates
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Currency Localization System

### Advanced Localization Engine

```typescript
class CurrencyLocalizationEngine {
  private currencyFormatterCache: Map<string, Intl.NumberFormat>;
  private regionCurrencyMap: Map<string, string>;
  private localizationRules: LocalizationRulesEngine;

  constructor() {
    this.currencyFormatterCache = new Map();
    this.regionCurrencyMap = new Map();
    this.localizationRules = new LocalizationRulesEngine();
    this.initializeRegionCurrencyMapping();
  }

  async formatCurrency(
    amount: number,
    currency: string,
    locale: string,
    options: CurrencyFormattingOptions = {}
  ): Promise<FormattedCurrency> {
    try {
      const formatterKey = `${currency}-${locale}-${JSON.stringify(options)}`;
      
      let formatter = this.currencyFormatterCache.get(formatterKey);
      if (!formatter) {
        formatter = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: options.minimumFractionDigits ?? this.getDefaultDecimals(currency),
          maximumFractionDigits: options.maximumFractionDigits ?? this.getDefaultDecimals(currency),
          currencyDisplay: options.currencyDisplay ?? 'symbol'
        });
        
        this.currencyFormatterCache.set(formatterKey, formatter);
      }

      const formattedString = formatter.format(amount);
      
      // Apply localization rules
      const localizedString = await this.localizationRules.applyRules(
        formattedString,
        currency,
        locale,
        amount
      );

      return {
        formatted: localizedString,
        currency,
        locale,
        amount,
        parts: this.parseCurrencyParts(formattedString, formatter),
        metadata: {
          symbol: this.getCurrencySymbol(currency, locale),
          placement: this.getSymbolPlacement(currency, locale),
          separator: this.getThousandsSeparator(locale),
          decimalSeparator: this.getDecimalSeparator(locale)
        }
      };

    } catch (error) {
      console.error('Currency formatting failed:', error);
      throw new CurrencyFormattingError('Failed to format currency', error);
    }
  }

  async getPreferredCurrency(region: string): Promise<string> {
    // Check cache first
    const cached = this.regionCurrencyMap.get(region);
    if (cached) {
      return cached;
    }

    // Determine currency based on region
    const currency = await this.determineCurrencyForRegion(region);
    
    // Cache result
    this.regionCurrencyMap.set(region, currency);
    
    return currency;
  }

  private async determineCurrencyForRegion(region: string): Promise<string> {
    // Country-specific mappings
    const countryMappings: Record<string, string> = {
      'US': 'USD',
      'CA': 'CAD',
      'GB': 'GBP',
      'DE': 'EUR',
      'FR': 'EUR',
      'ES': 'EUR',
      'IT': 'EUR',
      'NL': 'EUR',
      'JP': 'JPY',
      'AU': 'AUD',
      'BR': 'BRL',
      'MX': 'MXN',
      'IN': 'INR',
      'CN': 'CNY',
      'KR': 'KRW',
      'SG': 'SGD',
      'HK': 'HKD',
      'CH': 'CHF',
      'NO': 'NOK',
      'SE': 'SEK',
      'DK': 'DKK',
      'PL': 'PLN',
      'CZ': 'CZK',
      'HU': 'HUF',
      'TR': 'TRY',
      'RU': 'RUB',
      'ZA': 'ZAR'
    };

    // Direct country match
    if (countryMappings[region]) {
      return countryMappings[region];
    }

    // Region-specific logic for EU countries
    if (this.isEurozoneMember(region)) {
      return 'EUR';
    }

    // Default fallback
    return 'USD';
  }

  private isEurozoneMember(countryCode: string): boolean {
    const eurozoneMembers = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
    ];
    
    return eurozoneMembers.includes(countryCode);
  }

  async createLocalizedPriceDisplay(
    price: number,
    baseCurrency: string,
    userRegion: string,
    userPreferences: UserCurrencyPreferences
  ): Promise<LocalizedPriceDisplay> {
    // Get user's preferred currency
    const preferredCurrency = userPreferences.currency || 
                             await this.getPreferredCurrency(userRegion);

    // Convert if necessary
    let displayPrice = price;
    let conversionInfo: ConversionInfo | null = null;

    if (baseCurrency !== preferredCurrency) {
      const conversion = await this.convertCurrency(
        price,
        baseCurrency,
        preferredCurrency
      );
      
      displayPrice = conversion.toAmount;
      conversionInfo = {
        originalAmount: price,
        originalCurrency: baseCurrency,
        exchangeRate: conversion.exchangeRate,
        lastUpdated: conversion.timestamp
      };
    }

    // Format currency
    const formatted = await this.formatCurrency(
      displayPrice,
      preferredCurrency,
      userPreferences.locale || this.getDefaultLocale(userRegion)
    );

    // Generate alternative displays
    const alternatives = await this.generateAlternativePriceDisplays(
      price,
      baseCurrency,
      userRegion
    );

    return {
      primaryDisplay: formatted,
      conversionInfo,
      alternatives,
      confidence: conversionInfo ? conversionInfo.exchangeRate : 1.0,
      lastUpdated: new Date()
    };
  }

  private async generateAlternativePriceDisplays(
    price: number,
    baseCurrency: string,
    userRegion: string
  ): Promise<AlternativePriceDisplay[]> {
    const alternatives: AlternativePriceDisplay[] = [];
    
    // Major currency alternatives
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
    
    for (const currency of majorCurrencies) {
      if (currency === baseCurrency) continue;
      
      try {
        const conversion = await this.convertCurrency(price, baseCurrency, currency);
        const formatted = await this.formatCurrency(
          conversion.toAmount,
          currency,
          this.getDefaultLocale('US') // Use neutral locale for alternatives
        );
        
        alternatives.push({
          currency,
          amount: conversion.toAmount,
          formatted: formatted.formatted,
          popularity: this.getCurrencyPopularity(currency, userRegion)
        });
      } catch (error) {
        console.warn(`Failed to generate alternative for ${currency}:`, error);
      }
    }

    // Sort by popularity
    return alternatives.sort((a, b) => b.popularity - a.popularity);
  }

  async validateCurrencySupport(currency: string, region?: string): Promise<CurrencySupportInfo> {
    const supportInfo: CurrencySupportInfo = {
      currency,
      isSupported: false,
      paymentMethodSupport: [],
      regionalSupport: [],
      limitations: []
    };

    // Check if currency is valid (ISO 4217)
    if (!this.isValidCurrencyCode(currency)) {
      supportInfo.limitations.push('Invalid ISO 4217 currency code');
      return supportInfo;
    }

    // Check payment method support
    supportInfo.paymentMethodSupport = await this.checkPaymentMethodSupport(currency);
    
    // Check regional support
    if (region) {
      supportInfo.regionalSupport = await this.checkRegionalSupport(currency, region);
    }

    // Check for limitations
    supportInfo.limitations = await this.identifyCurrencyLimitations(currency, region);

    supportInfo.isSupported = 
      supportInfo.paymentMethodSupport.length > 0 &&
      supportInfo.limitations.length === 0;

    return supportInfo;
  }
}
```

## Payment Method Currency Support

### Multi-Currency Payment Processing

```typescript
class MultiCurrencyPaymentProcessor {
  private paymentProviders: Map<string, PaymentProviderInterface>;
  private currencyCompatibility: CurrencyCompatibilityMatrix;
  private settlementManager: SettlementManager;

  constructor() {
    this.paymentProviders = new Map([
      ['stripe', new StripeMultiCurrencyProvider()],
      ['paypal', new PayPalMultiCurrencyProvider()],
      ['adyen', new AdyenMultiCurrencyProvider()],
      ['square', new SquareMultiCurrencyProvider()]
    ]);
    
    this.currencyCompatibility = new CurrencyCompatibilityMatrix();
    this.settlementManager = new SettlementManager();
  }

  async processMultiCurrencyPayment(
    paymentRequest: MultiCurrencyPaymentRequest
  ): Promise<PaymentResult> {
    try {
      // Validate currency support
      const supportValidation = await this.validateCurrencySupport(paymentRequest);
      if (!supportValidation.isSupported) {
        throw new UnsupportedCurrencyError(
          `Currency ${paymentRequest.currency} not supported: ${supportValidation.reason}`
        );
      }

      // Select optimal payment provider
      const optimalProvider = await this.selectOptimalProvider(paymentRequest);
      
      // Determine processing currency
      const processingCurrency = await this.determineProcessingCurrency(
        paymentRequest,
        optimalProvider
      );

      // Handle currency conversion if needed
      let processedRequest = paymentRequest;
      let conversionDetails: ConversionDetails | null = null;
      
      if (paymentRequest.currency !== processingCurrency) {
        const conversionResult = await this.handleCurrencyConversion(
          paymentRequest,
          processingCurrency
        );
        
        processedRequest = conversionResult.convertedRequest;
        conversionDetails = conversionResult.conversionDetails;
      }

      // Process payment
      const provider = this.paymentProviders.get(optimalProvider);
      const paymentResult = await provider!.processPayment(processedRequest);

      // Handle settlement
      const settlementResult = await this.settlementManager.processSettlement({
        paymentId: paymentResult.paymentId,
        originalCurrency: paymentRequest.currency,
        processingCurrency: processingCurrency,
        conversionDetails
      });

      return {
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        originalAmount: paymentRequest.amount,
        originalCurrency: paymentRequest.currency,
        processedAmount: processedRequest.amount,
        processedCurrency: processingCurrency,
        fees: this.calculateTotalFees(paymentResult.fees, conversionDetails),
        conversionDetails,
        settlementDetails: settlementResult,
        provider: optimalProvider,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Multi-currency payment processing failed:', error);
      throw new PaymentProcessingError('Multi-currency payment failed', error);
    }
  }

  private async selectOptimalProvider(
    request: MultiCurrencyPaymentRequest
  ): Promise<string> {
    const evaluations: ProviderEvaluation[] = [];
    
    for (const [providerName, provider] of this.paymentProviders) {
      try {
        const evaluation = await this.evaluateProvider(provider, request);
        evaluations.push({
          provider: providerName,
          score: evaluation.score,
          fees: evaluation.fees,
          supportLevel: evaluation.supportLevel,
          processingTime: evaluation.processingTime
        });
      } catch (error) {
        console.warn(`Provider ${providerName} evaluation failed:`, error);
      }
    }

    // Sort by score and select best
    evaluations.sort((a, b) => b.score - a.score);
    
    if (evaluations.length === 0) {
      throw new NoSupportedProviderError('No payment providers support this currency');
    }

    return evaluations[0].provider;
  }

  private async evaluateProvider(
    provider: PaymentProviderInterface,
    request: MultiCurrencyPaymentRequest
  ): Promise<ProviderEvaluationResult> {
    // Check currency support
    const currencySupport = await provider.getCurrencySupport(request.currency);
    if (!currencySupport.isSupported) {
      throw new UnsupportedCurrencyError(`Provider doesn't support ${request.currency}`);
    }

    // Calculate fees
    const fees = await provider.calculateFees(request);
    
    // Get processing time estimate
    const processingTime = await provider.getProcessingTimeEstimate(request);
    
    // Calculate score based on multiple factors
    const score = this.calculateProviderScore({
      fees: fees.total,
      processingTime,
      currencySupport: currencySupport.supportLevel,
      reliability: provider.getReliabilityScore(),
      featureSupport: provider.getFeatureSupport(request)
    });

    return {
      score,
      fees,
      supportLevel: currencySupport.supportLevel,
      processingTime
    };
  }

  async handleCurrencyArbitrage(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Get rates from all providers
    const providerRates = await Promise.all(
      Array.from(this.paymentProviders.entries()).map(async ([name, provider]) => {
        try {
          const rate = await provider.getExchangeRate(fromCurrency, toCurrency);
          return { provider: name, rate };
        } catch (error) {
          return null;
        }
      })
    );

    const validRates = providerRates.filter(Boolean) as { provider: string; rate: number }[];
    
    if (validRates.length < 2) {
      return opportunities; // Need at least 2 providers for arbitrage
    }

    // Find arbitrage opportunities
    for (let i = 0; i < validRates.length; i++) {
      for (let j = i + 1; j < validRates.length; j++) {
        const rate1 = validRates[i];
        const rate2 = validRates[j];
        
        const rateDiff = Math.abs(rate1.rate - rate2.rate);
        const profitPercent = (rateDiff / Math.min(rate1.rate, rate2.rate)) * 100;
        
        if (profitPercent > 0.5) { // Minimum 0.5% profit threshold
          const betterRate = rate1.rate > rate2.rate ? rate1 : rate2;
          const worseRate = rate1.rate > rate2.rate ? rate2 : rate1;
          
          opportunities.push({
            buyFrom: worseRate.provider,
            sellTo: betterRate.provider,
            profitPercent,
            estimatedProfit: amount * rateDiff,
            volume: amount,
            fromCurrency,
            toCurrency,
            timestamp: new Date()
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }
}
```

## Currency Risk Management

### Advanced Risk Assessment

```typescript
class CurrencyRiskManager {
  private riskAnalyzer: CurrencyRiskAnalyzer;
  private hedgingEngine: CurrencyHedgingEngine;
  private exposureTracker: ExposureTracker;
  private alertSystem: RiskAlertSystem;

  constructor() {
    this.riskAnalyzer = new CurrencyRiskAnalyzer();
    this.hedgingEngine = new CurrencyHedgingEngine();
    this.exposureTracker = new ExposureTracker();
    this.alertSystem = new RiskAlertSystem();
  }

  async assessCurrencyRisk(
    exposures: CurrencyExposure[],
    timeHorizon: number = 30 // days
  ): Promise<CurrencyRiskAssessment> {
    try {
      const riskMetrics = await Promise.all([
        this.calculateValueAtRisk(exposures, timeHorizon),
        this.calculateExpectedShortfall(exposures, timeHorizon),
        this.analyzeVolatilityExposure(exposures),
        this.assessLiquidityRisk(exposures),
        this.calculateCorrelationRisk(exposures)
      ]);

      const [var95, expectedShortfall, volatilityRisk, liquidityRisk, correlationRisk] = riskMetrics;

      const overallRisk = this.calculateOverallRiskScore([
        var95.riskScore,
        volatilityRisk.riskScore,
        liquidityRisk.riskScore,
        correlationRisk.riskScore
      ]);

      const recommendations = await this.generateRiskRecommendations(
        exposures,
        overallRisk,
        riskMetrics
      );

      return {
        overallRiskScore: overallRisk,
        valueAtRisk: var95,
        expectedShortfall,
        volatilityRisk,
        liquidityRisk,
        correlationRisk,
        recommendations,
        assessmentDate: new Date(),
        timeHorizon
      };

    } catch (error) {
      console.error('Currency risk assessment failed:', error);
      throw new RiskAssessmentError('Failed to assess currency risk', error);
    }
  }

  private async calculateValueAtRisk(
    exposures: CurrencyExposure[],
    timeHorizon: number,
    confidenceLevel: number = 0.95
  ): Promise<ValueAtRiskResult> {
    const portfolioReturns: number[] = [];
    
    // Simulate portfolio returns using Monte Carlo
    const numSimulations = 10000;
    
    for (let i = 0; i < numSimulations; i++) {
      let portfolioReturn = 0;
      
      for (const exposure of exposures) {
        // Get historical volatility
        const volatility = await this.getHistoricalVolatility(
          exposure.currency,
          timeHorizon
        );
        
        // Generate random return using normal distribution
        const randomReturn = this.generateNormalRandom(0, volatility);
        portfolioReturn += exposure.amount * randomReturn;
      }
      
      portfolioReturns.push(portfolioReturn);
    }
    
    // Sort returns and find VaR
    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
    const valueAtRisk = Math.abs(portfolioReturns[varIndex]);
    
    return {
      var: valueAtRisk,
      confidenceLevel,
      timeHorizon,
      riskScore: Math.min(valueAtRisk / 1000000, 1.0), // Normalize to 0-1 scale
      interpretation: this.interpretVaR(valueAtRisk, confidenceLevel)
    };
  }

  async implementCurrencyHedging(
    exposures: CurrencyExposure[],
    hedgingStrategy: HedgingStrategy
  ): Promise<HedgingResult> {
    const hedgingInstruments: HedgingInstrument[] = [];
    
    for (const exposure of exposures) {
      if (exposure.amount < hedgingStrategy.minimumHedgeAmount) {
        continue; // Skip small exposures
      }
      
      const hedgeRatio = this.calculateOptimalHedgeRatio(exposure, hedgingStrategy);
      const hedgeAmount = exposure.amount * hedgeRatio;
      
      // Select hedging instrument
      const instrument = await this.selectHedgingInstrument(
        exposure.currency,
        hedgeAmount,
        hedgingStrategy
      );
      
      if (instrument) {
        // Execute hedge
        const hedgeExecution = await this.executeHedge(instrument, hedgeAmount);
        
        hedgingInstruments.push({
          ...instrument,
          executionDetails: hedgeExecution,
          hedgeAmount,
          hedgeRatio,
          effectiveDate: new Date()
        });
      }
    }
    
    return {
      hedgingInstruments,
      totalHedged: hedgingInstruments.reduce((sum, h) => sum + h.hedgeAmount, 0),
      hedgingCost: hedgingInstruments.reduce((sum, h) => sum + h.cost, 0),
      riskReduction: await this.calculateRiskReduction(exposures, hedgingInstruments),
      effectivenessRatio: this.calculateHedgeEffectiveness(hedgingInstruments)
    };
  }

  async monitorCurrencyExposure(): Promise<void> {
    // Get current exposures
    const exposures = await this.exposureTracker.getCurrentExposures();
    
    // Assess risk
    const riskAssessment = await this.assessCurrencyRisk(exposures);
    
    // Check for risk limit breaches
    const breaches = await this.checkRiskLimits(riskAssessment, exposures);
    
    if (breaches.length > 0) {
      // Alert risk management team
      await this.alertSystem.sendRiskAlert({
        type: 'risk_limit_breach',
        severity: 'high',
        breaches,
        currentRisk: riskAssessment,
        timestamp: new Date()
      });
      
      // Implement automatic risk reduction if configured
      if (this.isAutoHedgingEnabled()) {
        await this.implementEmergencyHedging(breaches);
      }
    }
    
    // Update risk dashboard
    await this.updateRiskDashboard(riskAssessment, exposures);
  }

  private async calculateOptimalHedgeRatio(
    exposure: CurrencyExposure,
    strategy: HedgingStrategy
  ): Promise<number> {
    switch (strategy.type) {
      case 'full_hedge':
        return 1.0;
      
      case 'selective_hedge':
        const volatility = await this.getHistoricalVolatility(exposure.currency, 30);
        return Math.min(volatility * 2, 1.0); // Hedge more for volatile currencies
      
      case 'dynamic_hedge':
        return await this.calculateDynamicHedgeRatio(exposure, strategy);
      
      default:
        return strategy.targetHedgeRatio || 0.5;
    }
  }

  private async generateRiskRecommendations(
    exposures: CurrencyExposure[],
    overallRisk: number,
    metrics: any[]
  ): Promise<RiskRecommendation[]> {
    const recommendations: RiskRecommendation[] = [];
    
    if (overallRisk > 0.8) {
      recommendations.push({
        type: 'immediate_action',
        priority: 'critical',
        description: 'Currency risk exceeds acceptable limits',
        actions: [
          'Implement immediate hedging for major exposures',
          'Review and reduce currency concentration',
          'Consider currency diversification strategies'
        ]
      });
    }
    
    if (overallRisk > 0.6) {
      recommendations.push({
        type: 'risk_reduction',
        priority: 'high',
        description: 'Elevated currency risk detected',
        actions: [
          'Establish hedging program for major currencies',
          'Set up real-time risk monitoring',
          'Consider natural hedging opportunities'
        ]
      });
    }
    
    // Currency-specific recommendations
    for (const exposure of exposures) {
      const currencyVolatility = await this.getHistoricalVolatility(exposure.currency, 30);
      
      if (currencyVolatility > 0.15) { // 15% annual volatility
        recommendations.push({
          type: 'currency_specific',
          priority: 'medium',
          description: `High volatility in ${exposure.currency}`,
          actions: [
            `Consider hedging ${exposure.currency} exposure`,
            `Monitor ${exposure.currency} economic indicators`,
            `Set up volatility alerts for ${exposure.currency}`
          ]
        });
      }
    }
    
    return recommendations;
  }
}
```

This comprehensive multi-currency support guide provides a robust foundation for handling international payments, currency conversions, and risk management in the 7P Education Platform. The system emphasizes real-time exchange rates, intelligent currency selection, advanced localization, and proactive risk management.