package services

import (
	"context"
	"encoding/json"
	"log"
	"strings"

	"github.com/segmentio/kafka-go"
)

type KafkaService struct {
	brokers []string
	writer  *kafka.Writer
}

func NewKafkaService(brokers string) *KafkaService {
	if brokers == "" {
		log.Println("No Kafka brokers provided, Kafka features disabled")
		return &KafkaService{brokers: nil}
	}

	brokerList := strings.Split(brokers, ",")

	writer := &kafka.Writer{
		Addr:     kafka.TCP(brokerList...),
		Balancer: &kafka.LeastBytes{},
	}

	log.Println("Kafka writer initialized")

	return &KafkaService{
		brokers: brokerList,
		writer:  writer,
	}
}

func (ks *KafkaService) Close() {
	if ks.writer != nil {
		ks.writer.Close()
	}
}

func (ks *KafkaService) PublishOrder(order interface{}) error {
	if ks.writer == nil {
		return nil // Kafka disabled
	}

	data, err := json.Marshal(order)
	if err != nil {
		return err
	}

	return ks.writer.WriteMessages(context.Background(),
		kafka.Message{
			Topic: "orders",
			Value: data,
		},
	)
}

func (ks *KafkaService) PublishExecution(execution interface{}) error {
	if ks.writer == nil {
		return nil // Kafka disabled
	}

	data, err := json.Marshal(execution)
	if err != nil {
		return err
	}

	return ks.writer.WriteMessages(context.Background(),
		kafka.Message{
			Topic: "executions",
			Value: data,
		},
	)
}

func (ks *KafkaService) PublishMarketData(marketData interface{}) error {
	if ks.writer == nil {
		return nil // Kafka disabled
	}

	data, err := json.Marshal(marketData)
	if err != nil {
		return err
	}

	return ks.writer.WriteMessages(context.Background(),
		kafka.Message{
			Topic: "market-data",
			Value: data,
		},
	)
}

