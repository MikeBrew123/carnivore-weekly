#!/usr/bin/env python3
"""
Advanced Configuration System for Carnivore Weekly

This module provides a centralized configuration management system that:
- Loads base configuration from config/project.json
- Applies environment-specific overrides (development, staging, production)
- Allows environment variables to override config values
- Supports .env file loading for sensitive data
- Validates configuration on load
- Provides logging of loaded configuration

Usage:
    from scripts.config import ConfigLoader

    config = ConfigLoader()
    api_key = config.get("services.anthropic.key_env")
    timeout = config.get("services.youtube.timeout")

    # Override with environment variable
    api_key = config.get("ANTHROPIC_API_KEY")

    # Deep dictionary access
    anthropic_config = config.get_section("services.anthropic")

    # With defaults
    value = config.get("some.key", default=10)

Configuration Priority (highest to lowest):
1. Environment variables (prefixed with APP_)
2. .env file variables
3. Environment-specific config (config/environments/{ENV}.json)
4. Base config (config/project.json)
5. Default values

Author: Quinn (Operations Manager - Phase 3)
Date: 2026-01-01
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import sys


class ConfigError(Exception):
    """Raised when configuration loading or validation fails"""
    pass


class ConfigLoader:
    """Central configuration management for Carnivore Weekly"""

    # Default base configuration path
    DEFAULT_CONFIG_PATH = "config/project.json"

    def __init__(
        self,
        config_path: str = DEFAULT_CONFIG_PATH,
        environment: Optional[str] = None,
        load_env_file: bool = True,
        env_file_path: str = ".env",
        log_config: bool = True,
    ):
        """
        Initialize ConfigLoader

        Args:
            config_path: Path to base config file (default: config/project.json)
            environment: Environment name (dev/staging/prod). Auto-detect if None
            load_env_file: Whether to load .env file
            env_file_path: Path to .env file
            log_config: Whether to log configuration on load
        """
        self.config_path = Path(config_path)
        self.env_file_path = Path(env_file_path)
        self.log_config_enabled = log_config

        # Setup logging
        self.logger = self._setup_logger()

        # Load environment variables from .env file
        if load_env_file and self.env_file_path.exists():
            load_dotenv(self.env_file_path)
            self.logger.debug(f"Loaded .env file from: {self.env_file_path}")

        # Determine environment
        self.environment = environment or os.getenv(
            "ENVIRONMENT", "development"
        )
        self.logger.debug(f"Using environment: {self.environment}")

        # Load configuration
        self.config = {}
        self._load_configuration()

        # Log final configuration (with secrets masked)
        if self.log_config_enabled:
            self._log_configuration()

    def _setup_logger(self) -> logging.Logger:
        """Setup logging for configuration system"""
        logger = logging.getLogger("carnivore_config")

        # Only setup if not already configured
        if not logger.handlers:
            # Get log level from environment, default to INFO
            log_level = os.getenv("LOG_LEVEL", "INFO").upper()
            logger.setLevel(getattr(logging, log_level, logging.INFO))

            # Console handler
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                "[%(name)s] %(levelname)s: %(message)s"
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def _load_configuration(self):
        """Load and merge all configuration sources"""
        # Load base configuration
        base_config = self._load_json_file(
            self.config_path, "base configuration"
        )
        self.config = base_config.copy()

        # Load environment-specific overrides
        env_config_path = (
            Path("config/environments") / f"{self.environment}.json"
        )
        if env_config_path.exists():
            env_config = self._load_json_file(
                env_config_path, f"{self.environment} environment"
            )
            self.config = self._deep_merge(self.config, env_config)
            self.logger.info(f"Applied {self.environment} environment overrides")
        else:
            self.logger.warning(
                f"No environment config found at {env_config_path}, "
                f"using base configuration only"
            )

        # Apply environment variable overrides
        self._apply_env_overrides()

        # Validate configuration
        self._validate_configuration()

        self.logger.debug("Configuration loaded successfully")

    def _load_json_file(self, path: Path, description: str) -> Dict:
        """Load JSON configuration file"""
        path = Path(path)

        if not path.exists():
            raise ConfigError(f"{description.capitalize()} file not found: {path}")

        try:
            with open(path, "r", encoding="utf-8") as f:
                config = json.load(f)
            self.logger.debug(f"Loaded {description}: {path}")
            return config
        except json.JSONDecodeError as e:
            raise ConfigError(f"Invalid JSON in {description}: {path}\n{e}")
        except Exception as e:
            raise ConfigError(f"Error loading {description}: {path}\n{e}")

    def _apply_env_overrides(self):
        """Apply environment variable overrides to configuration"""
        env_overrides = {}

        # Scan environment for APP_* variables
        for key, value in os.environ.items():
            if key.startswith("APP_"):
                # Remove APP_ prefix and convert to config path
                config_key = key[4:].lower()  # Remove "APP_" prefix
                env_overrides[config_key] = value
                self.logger.debug(f"Found environment override: {key}")

        # Apply overrides
        for key, value in env_overrides.items():
            self._set_nested_value(self.config, key, value)

    def _set_nested_value(self, dictionary: Dict, key_path: str, value: Any):
        """Set a value in nested dictionary using dot notation"""
        keys = key_path.split(".")
        current = dictionary

        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        current[keys[-1]] = value

    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge override dictionary into base dictionary"""
        result = base.copy()

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(
                value, dict
            ):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    def _validate_configuration(self):
        """Validate required configuration settings"""
        # Check for required environment variables if specified
        security_config = self.config.get("security", {})

        if security_config.get("validate_env_vars"):
            required_vars = security_config.get("required_env_vars", [])
            missing_vars = [
                var for var in required_vars if not os.getenv(var)
            ]

            if missing_vars:
                self.logger.warning(
                    f"Missing required environment variables: {', '.join(missing_vars)}"
                )
                if self.environment == "production":
                    raise ConfigError(
                        f"Missing required environment variables in production: "
                        f"{', '.join(missing_vars)}"
                    )

        self.logger.debug("Configuration validation completed")

    def _log_configuration(self):
        """Log loaded configuration (with secrets masked)"""
        masked_config = self._mask_secrets(self.config)
        self.logger.info(f"Configuration loaded for environment: {self.environment}")
        self.logger.debug(f"Full config: {json.dumps(masked_config, indent=2)}")

    def _mask_secrets(self, obj: Any) -> Any:
        """Recursively mask sensitive values in configuration"""
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                if self._is_sensitive_key(key):
                    result[key] = "***MASKED***"
                else:
                    result[key] = self._mask_secrets(value)
            return result
        elif isinstance(obj, list):
            return [self._mask_secrets(item) for item in obj]
        else:
            return obj

    def _is_sensitive_key(self, key: str) -> bool:
        """Determine if a key contains sensitive data"""
        sensitive_patterns = [
            "key",
            "secret",
            "password",
            "token",
            "api_key",
            "auth",
        ]
        key_lower = key.lower()
        return any(pattern in key_lower for pattern in sensitive_patterns)

    def get(
        self, key_path: str, default: Any = None
    ) -> Any:
        """
        Get configuration value by dot-notation path

        Args:
            key_path: Path to value using dot notation (e.g. "services.anthropic.timeout")
            default: Default value if key not found

        Returns:
            Configuration value or default

        Examples:
            config.get("services.youtube.timeout", default=30)
            config.get("api.anthropic.key_env")
        """
        # First check environment variables
        env_var = os.getenv(key_path)
        if env_var is not None:
            return env_var

        # Then check configuration
        keys = key_path.split(".")
        current = self.config

        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                self.logger.debug(
                    f"Configuration key not found: {key_path}, using default"
                )
                return default

        return current

    def get_section(self, section_path: str) -> Dict:
        """
        Get entire configuration section

        Args:
            section_path: Path to section using dot notation

        Returns:
            Dictionary containing the section

        Examples:
            anthropic_config = config.get_section("services.anthropic")
            env_config = config.get_section("environments.production")
        """
        section = self.get(section_path, default={})
        if not isinstance(section, dict):
            raise ConfigError(f"Configuration section is not a dictionary: {section_path}")
        return section

    def get_service_config(self, service_name: str) -> Dict:
        """
        Get configuration for a specific service

        Args:
            service_name: Name of service (e.g., "anthropic", "youtube")

        Returns:
            Service configuration dictionary

        Example:
            youtube_config = config.get_service_config("youtube")
        """
        return self.get_section(f"services.{service_name}")

    def get_api_key(self, service_name: str) -> Optional[str]:
        """
        Get API key for a service from environment variables

        Args:
            service_name: Name of service (e.g., "anthropic", "youtube")

        Returns:
            API key value or None if not found

        Example:
            api_key = config.get_api_key("anthropic")
        """
        service_config = self.get_service_config(service_name)
        key_env_var = service_config.get("key_env")

        if not key_env_var:
            self.logger.warning(f"No key_env configured for service: {service_name}")
            return None

        return os.getenv(key_env_var)

    def get_service_timeout(self, service_name: str, default: int = 30) -> int:
        """
        Get timeout for a service in seconds

        Args:
            service_name: Name of service
            default: Default timeout if not configured

        Returns:
            Timeout in seconds

        Example:
            timeout = config.get_service_timeout("youtube")
        """
        return self.get(f"services.{service_name}.timeout", default=default)

    def get_model(self, service_name: str, model_type: str = "default") -> str:
        """
        Get model name for a service

        Args:
            service_name: Name of service (e.g., "anthropic")
            model_type: Type of model (e.g., "default", "haiku", "opus")

        Returns:
            Model name

        Example:
            model = config.get_model("anthropic", "default")
        """
        key = f"services.{service_name}.model_{model_type}"
        return self.get(key, default="unknown")

    def is_feature_enabled(self, feature_path: str) -> bool:
        """
        Check if a feature is enabled

        Args:
            feature_path: Path to feature (e.g., "auto_linking", "sentiment_analysis")

        Returns:
            True if feature is enabled, False otherwise

        Example:
            if config.is_feature_enabled("sentiment_analysis"):
                # do something
        """
        enabled = self.get(f"features.{feature_path}.enabled", default=False)
        return bool(enabled)

    def get_environment(self) -> str:
        """Get current environment name"""
        return self.environment

    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() == "production"

    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment.lower() == "development"

    def to_dict(self) -> Dict:
        """Get entire configuration as dictionary (with secrets masked)"""
        return self._mask_secrets(self.config)

    def to_json(self, indent: int = 2) -> str:
        """Get entire configuration as JSON string (with secrets masked)"""
        return json.dumps(self.to_dict(), indent=indent)


# Global configuration instance (lazy-loaded)
_config_instance = None


def get_config() -> ConfigLoader:
    """Get global configuration instance (creates on first call)"""
    global _config_instance
    if _config_instance is None:
        _config_instance = ConfigLoader()
    return _config_instance


def reset_config():
    """Reset global configuration instance (useful for testing)"""
    global _config_instance
    _config_instance = None


if __name__ == "__main__":
    # Test configuration loading
    print("Testing ConfigLoader...\n")

    try:
        config = ConfigLoader()

        print(f"Environment: {config.get_environment()}")
        print(f"Is production: {config.is_production()}")
        print(f"Is development: {config.is_development()}")
        print()

        print("Service configurations:")
        for service in ["youtube", "anthropic", "supabase"]:
            service_config = config.get_service_config(service)
            print(f"  {service}: {service_config.get('endpoint', 'N/A')}")
        print()

        print("Feature flags:")
        for feature in ["auto_linking", "sentiment_analysis", "qa_generation"]:
            enabled = config.is_feature_enabled(feature)
            print(f"  {feature}: {'enabled' if enabled else 'disabled'}")
        print()

        print("Configuration loaded successfully!")
        print(f"\nFull configuration (secrets masked):\n")
        print(config.to_json())

    except ConfigError as e:
        print(f"Configuration Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
