import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Grid, 
  List, 
  SlidersHorizontal, 
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  Filter,
  Loader2
} from "lucide-react";
import WheelOpportunityCard from "@/components/WheelOpportunityCard";

/**
 * Wheel Opportunity Grid Component
 * Displays wheel opportunities in an organized, filterable grid layout
 */
const WheelOpportunityGrid = ({
  opportunities = [],
  isLoading = false,
  onCreateWheel = null,
  onViewDetails = null,
  className = ""
}) => {
  // State for filtering and sorting
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('confidence'); // 'confidence', 'ticker', 'income', 'expiration'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filterStrategy, setFilterStrategy] = useState('all'); // 'all', 'covered_call', etc.
  const [filterConfidence, setFilterConfidence] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [searchTicker, setSearchTicker] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort opportunities
  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Filter by ticker search
    if (searchTicker.trim()) {
      filtered = filtered.filter(op => 
        op.ticker?.toLowerCase().includes(searchTicker.toLowerCase())
      );
    }

    // Filter by strategy
    if (filterStrategy !== 'all') {
      filtered = filtered.filter(op => op.strategy === filterStrategy);
    }

    // Filter by confidence level
    if (filterConfidence !== 'all') {
      filtered = filtered.filter(op => {
        const score = op.confidence_score || 0;
        switch (filterConfidence) {
          case 'high': return score >= 80;
          case 'medium': return score >= 50 && score < 80;
          case 'low': return score < 50;
          default: return true;
        }
      });
    }

    // Sort opportunities
    filtered.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'confidence':
          valueA = a.confidence_score || 0;
          valueB = b.confidence_score || 0;
          break;
        case 'ticker':
          valueA = a.ticker || '';
          valueB = b.ticker || '';
          break;
        case 'income':
          valueA = a.potential_income || 0;
          valueB = b.potential_income || 0;
          break;
        case 'expiration':
          valueA = a.days_to_expiration || 999;
          valueB = b.days_to_expiration || 999;
          break;
        default:
          return 0;
      }

      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [opportunities, searchTicker, filterStrategy, filterConfidence, sortBy, sortOrder]);

  // Get unique strategies for filter options
  const availableStrategies = useMemo(() => {
    const strategies = [...new Set(opportunities.map(op => op.strategy))].filter(Boolean);
    return strategies.sort();
  }, [opportunities]);

  // Grid layout class based on view mode and number of items
  const getGridClass = () => {
    if (viewMode === 'list') return 'grid grid-cols-1 gap-4';
    
    const count = filteredAndSortedOpportunities.length;
    if (count === 1) return 'grid grid-cols-1 gap-6 max-w-md mx-auto';
    if (count === 2) return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
    return 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTicker('');
    setFilterStrategy('all');
    setFilterConfidence('all');
    setSortBy('confidence');
    setSortOrder('desc');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Wheel Opportunities
          </h3>
          <p className="text-slate-600 text-sm">
            {filteredAndSortedOpportunities.length} of {opportunities.length} opportunities
            {searchTicker && ` matching "${searchTicker}"`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>

          {/* View mode toggle */}
          <div className="border border-slate-300 rounded-lg p-1 flex">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3 py-1"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3 py-1"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Strategy filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Strategy
                </label>
                <select
                  value={filterStrategy}
                  onChange={(e) => setFilterStrategy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Strategies</option>
                  {availableStrategies.map(strategy => (
                    <option key={strategy} value={strategy}>
                      {strategy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confidence
                </label>
                <select
                  value={filterConfidence}
                  onChange={(e) => setFilterConfidence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="high">High (80%+)</option>
                  <option value="medium">Medium (50-79%)</option>
                  <option value="low">Low (&lt;50%)</option>
                </select>
              </div>

              {/* Sort by */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sort By
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="confidence-desc">Confidence (High to Low)</option>
                  <option value="confidence-asc">Confidence (Low to High)</option>
                  <option value="ticker-asc">Ticker (A to Z)</option>
                  <option value="ticker-desc">Ticker (Z to A)</option>
                  <option value="income-desc">Income (High to Low)</option>
                  <option value="income-asc">Income (Low to High)</option>
                  <option value="expiration-asc">Expiration (Soon to Late)</option>
                  <option value="expiration-desc">Expiration (Late to Soon)</option>
                </select>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                  size="sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Analyzing positions for wheel opportunities...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && opportunities.length === 0 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Wheel Opportunities Found
            </h3>
            <p className="text-slate-600 mb-4">
              Run position analysis to detect potential wheel strategies from your current holdings.
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Target className="w-4 h-4 mr-2" />
              Analyze Positions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results after filtering */}
      {!isLoading && opportunities.length > 0 && filteredAndSortedOpportunities.length === 0 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="text-center py-12">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Matching Opportunities
            </h3>
            <p className="text-slate-600 mb-4">
              Try adjusting your filters or search criteria.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Opportunities grid */}
      {!isLoading && filteredAndSortedOpportunities.length > 0 && (
        <div className={getGridClass()}>
          {filteredAndSortedOpportunities.map((opportunity, index) => (
            <WheelOpportunityCard
              key={`${opportunity.ticker}-${opportunity.strategy}-${index}`}
              opportunity={opportunity}
              onCreateWheel={onCreateWheel}
              onViewDetails={onViewDetails}
              className={viewMode === 'list' ? 'max-w-none' : ''}
            />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {!isLoading && filteredAndSortedOpportunities.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredAndSortedOpportunities.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Potential Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ${filteredAndSortedOpportunities
                    .reduce((sum, op) => sum + (op.potential_income || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    filteredAndSortedOpportunities
                      .reduce((sum, op) => sum + (op.confidence_score || 0), 0) /
                    filteredAndSortedOpportunities.length
                  )}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Strategies</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(filteredAndSortedOpportunities.map(op => op.strategy)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WheelOpportunityGrid;
