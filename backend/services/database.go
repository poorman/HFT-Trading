package services

import (
	"log"

	"github.com/hft/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DatabaseService struct {
	db *gorm.DB
}

func NewDatabaseService(dsn string) *DatabaseService {
	if dsn == "" {
		log.Println("No database URL provided, database features disabled")
		return &DatabaseService{db: nil}
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return &DatabaseService{db: nil}
	}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.Order{},
		&models.Execution{},
		&models.MoversPosition{},
		&models.RiskLimits{},
		&models.PositionLimit{},
		&models.RiskAlert{},
		&models.DailyPnLTracking{},
		&models.CircuitBreakerEvent{},
	); err != nil {
		log.Printf("Failed to migrate database: %v", err)
		return &DatabaseService{db: nil}
	}

	log.Println("Database connected successfully")

	return &DatabaseService{db: db}
}

func (ds *DatabaseService) SaveOrder(order *models.Order) error {
	if ds.db == nil {
		return nil // Database disabled
	}
	return ds.db.Create(order).Error
}

func (ds *DatabaseService) UpdateOrder(order *models.Order) error {
	if ds.db == nil {
		return nil // Database disabled
	}
	return ds.db.Save(order).Error
}

func (ds *DatabaseService) GetOrders(limit int) ([]models.Order, error) {
	if ds.db == nil {
		return []models.Order{}, nil
	}

	var orders []models.Order
	err := ds.db.Order("created_at DESC").Limit(limit).Find(&orders).Error
	return orders, err
}

func (ds *DatabaseService) GetOrderByID(orderID string) (*models.Order, error) {
	if ds.db == nil {
		return nil, nil
	}

	var order models.Order
	err := ds.db.Where("order_id = ?", orderID).First(&order).Error
	return &order, err
}

func (ds *DatabaseService) SaveExecution(execution *models.Execution) error {
	if ds.db == nil {
		return nil // Database disabled
	}
	return ds.db.Create(execution).Error
}

func (ds *DatabaseService) GetExecutions(limit int) ([]models.Execution, error) {
	if ds.db == nil {
		return []models.Execution{}, nil
	}

	var executions []models.Execution
	err := ds.db.Order("timestamp DESC").Limit(limit).Find(&executions).Error
	return executions, err
}

// MoversPosition methods
func (ds *DatabaseService) CreateMoversPosition(position *models.MoversPosition) error {
	if ds.db == nil {
		return nil // Database disabled
	}
	return ds.db.Create(position).Error
}

func (ds *DatabaseService) UpdateMoversPosition(position *models.MoversPosition) error {
	if ds.db == nil {
		return nil // Database disabled
	}
	return ds.db.Save(position).Error
}

func (ds *DatabaseService) GetActiveMoversPositions() ([]models.MoversPosition, error) {
	if ds.db == nil {
		return []models.MoversPosition{}, nil
	}

	var positions []models.MoversPosition
	err := ds.db.Where("status = ?", "open").Find(&positions).Error
	return positions, err
}

func (ds *DatabaseService) GetMoversPositionsBySymbol(symbol string) ([]models.MoversPosition, error) {
	if ds.db == nil {
		return []models.MoversPosition{}, nil
	}

	var positions []models.MoversPosition
	err := ds.db.Where("symbol = ?", symbol).Order("created_at DESC").Find(&positions).Error
	return positions, err
}

func (ds *DatabaseService) GetMoversPositionsByStatus(status string) ([]models.MoversPosition, error) {
	if ds.db == nil {
		return []models.MoversPosition{}, nil
	}

	var positions []models.MoversPosition
	err := ds.db.Where("status = ?", status).Order("created_at DESC").Find(&positions).Error
	return positions, err
}

func (ds *DatabaseService) GetMoversPerformance() (map[string]interface{}, error) {
	if ds.db == nil {
		return map[string]interface{}{}, nil
	}

	var result struct {
		TotalPositions   int64   `json:"total_positions"`
		OpenPositions    int64   `json:"open_positions"`
		ClosedPositions  int64   `json:"closed_positions"`
	TotalProfitLoss     float64 `json:"total_profit_loss"`
		AvgProfitPct      float64 `json:"avg_profit_pct"`
	}

	// Count total positions
	ds.db.Model(&models.MoversPosition{}).Count(&result.TotalPositions)

	// Count open positions
	ds.db.Model(&models.MoversPosition{}).Where("status = ?", "open").Count(&result.OpenPositions)

	// Count closed positions
	ds.db.Model(&models.MoversPosition{}).Where("status = ?", "closed").Count(&result.ClosedPositions)

	// Calculate total P&L and average profit %
	ds.db.Model(&models.MoversPosition{}).
		Select("COALESCE(SUM(profit_loss), 0) as total_profit_loss, COALESCE(AVG(profit_pct), 0) as avg_profit_pct").
		Where("status = ?", "closed").
		Scan(&result)

	return map[string]interface{}{
		"total_positions":   result.TotalPositions,
		"open_positions":    result.OpenPositions,
		"closed_positions":  result.ClosedPositions,
		"total_profit_loss": result.TotalProfitLoss,
		"avg_profit_pct":    result.AvgProfitPct,
	}, nil
}

// GetDB returns the underlying GORM DB instance for custom queries
func (ds *DatabaseService) GetDB() *gorm.DB {
	return ds.db
}

