# 🔍 Enhanced Multi-Attempt Search Workflow

## Complete Search Flow Diagram

```
┌─────────────────┐
│ User Input      │ "any course for EKS?"
│ React Frontend  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ handleSearch()  │ Initialize search with 3 attempts
│ Multi-Attempt   │ maxAttempts = 3, searchAttempt = 1
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ DynamoDB Query  │ Get all classes from Class table
│ Class Table     │ → 20 classes with descriptions
└─────────┬───────┘
          │
          ▼
    ┌─────────────┐
    │ ATTEMPT 1   │ Original Query Analysis
    └─────────────┘
          │
          ▼
┌─────────────────┐
│ Bedrock Call #1 │ Query: "any course for EKS?"
│ Claude 3 Haiku  │ + All class descriptions
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Parse Response  │ Extract semantic matches
│ Check Results   │ relevant_class_ids: []
└─────────┬───────┘
          │
          ▼ (No results found)
    ┌─────────────┐
    │ ATTEMPT 2   │ Enhanced Query Analysis
    └─────────────┘
          │
          ▼
┌─────────────────┐
│ Bedrock Call #2 │ Query: "Find courses related to: any course for EKS?"
│ Enhanced Prompt │ + Partial matching enabled
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Enhanced Terms  │ Add partial matches + substrings
│ Expansion       │ ["EKS", "eks", "EK", "kubernetes", "k8s"]
└─────────┬───────┘
          │
          ▼ (Still no results)
    ┌─────────────┐
    │ ATTEMPT 3   │ Aggressive Search
    └─────────────┘
          │
          ▼
┌─────────────────┐
│ Bedrock Call #3 │ Query: "Search for any classes about: any, course, EKS"
│ Word-by-Word    │ + Individual word matching
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Aggressive      │ Search individual words: ["any", "course", "EKS"]
│ Term Matching   │ + Cross-reference: EKS ↔ Kubernetes ↔ K8s
└─────────┬───────┘
          │
          ▼ (Found results!)
┌─────────────────┐
│ Results Found   │ 2 classes match "EKS" and "Kubernetes"
│ Break Loop      │ Exit attempt loop
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Sort Results    │ Rank by relevance score
│ by Relevance    │ Title match > Description match
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Display Results │ Show classes with match explanations
│ with Summary    │ + Bedrock analysis summary
└─────────────────┘
```

## Detailed Step-by-Step Process

### **Phase 1: Initialization**
```javascript
User Query: "any course for EKS?"
↓
Get all 20 classes from DynamoDB
↓
Initialize: searchAttempt = 1, maxAttempts = 3, filteredClasses = []
```

### **Phase 2: Attempt Loop**
```javascript
while (filteredClasses.length === 0 && searchAttempt <= 3) {
  // Try different strategies per attempt
}
```

#### **Attempt 1: Original Semantic Analysis**
```
Query to Bedrock: "any course for EKS?"
Class Descriptions: All 20 class descriptions sent
↓
Bedrock Analysis: {
  "primary_topic": "EKS",
  "search_terms": ["EKS", "Kubernetes", "K8s"],
  "relevant_class_ids": [] // Empty - no direct matches
}
↓
Fallback Term Search: Look for ["EKS", "Kubernetes", "K8s"] in descriptions
↓
Result: 0 classes found
```

#### **Attempt 2: Enhanced Analysis**
```
Query to Bedrock: "Find courses related to: any course for EKS?"
Enhanced Terms: Add partial matches + first 3 characters
Search Terms: ["EKS", "eks", "EK", "Kubernetes", "kubernetes", "kub", "K8s", "k8s"]
↓
More Aggressive Matching: Include substring matches
↓
Result: Still 0 classes (if descriptions don't contain these terms)
```

#### **Attempt 3: Word-by-Word Analysis**
```
Query to Bedrock: "Search for any classes about: any, course, EKS"
Individual Words: ["any", "course", "EKS"] (words > 2 chars)
Cross-References: EKS → ["kubernetes", "k8s", "container"]
↓
Search in Descriptions: Look for ANY of these terms
↓
Result: Found 2 classes containing "kubernetes" or "container"
```

### **Phase 3: Final Fallback (if needed)**
```javascript
if (filteredClasses.length === 0) {
  // Direct description search
  queryWords = ["any", "course", "EKS"]
  
  classes.filter(cls => {
    description = cls.description.toLowerCase()
    return queryWords.some(word => 
      description.includes(word) ||
      (word === "eks" && description.includes("kubernetes"))
    )
  })
}
```

### **Phase 4: Result Processing**
```javascript
// Sort by relevance
filteredClasses.sort((a, b) => {
  scoreA = calculateMatchScore(a, searchTerms)
  scoreB = calculateMatchScore(b, searchTerms)
  return scoreB - scoreA
})

// Display with explanations
setSearchResults(filteredClasses)
setSearchSummary(bedrockAnalysis)
```

## Real Example Flow

### **Input**: "any course for EKS?"

**Attempt 1**:
```
🔍 Search attempt 1/3
Bedrock Query: "any course for EKS?"
Bedrock Response: {"primary_topic": "EKS", "search_terms": ["EKS", "Kubernetes"]}
Term Search: Looking for "EKS", "Kubernetes" in 20 class descriptions
Result: 0 matches found
```

**Attempt 2**:
```
🔍 Search attempt 2/3
Bedrock Query: "Find courses related to: any course for EKS?"
Enhanced Terms: ["EKS", "eks", "EK", "Kubernetes", "kubernetes", "kub"]
Partial Matching: Enabled
Result: 0 matches found
```

**Attempt 3**:
```
🔍 Search attempt 3/3
Bedrock Query: "Search for any classes about: any, course, EKS"
Individual Words: ["any", "course", "EKS"]
Cross-Reference: EKS → ["kubernetes", "k8s", "container", "orchestration"]
Aggressive Search: ANY term match in description
Result: ✅ Found 2 classes with "kubernetes" and "container"
```

**Final Output**:
```
🎯 Final results: 2 classes found after 3 attempts

Classes:
1. "Kubernetes Fundamentals" - Matches: "kubernetes" in description
2. "Container Orchestration" - Matches: "container" in description
```

## Key Features

- **🔄 Persistent**: Never gives up until all strategies exhausted
- **📈 Progressive**: Each attempt gets more aggressive
- **🎯 Smart**: Stops immediately when results found
- **🛡️ Fallback**: Direct DynamoDB search as last resort
- **📊 Transparent**: Shows exactly why each class was matched
- **⚡ Efficient**: 500ms delay between attempts, breaks early on success

This workflow ensures that relevant classes are found from the DynamoDB Class table even if the initial Bedrock analysis doesn't work perfectly!
