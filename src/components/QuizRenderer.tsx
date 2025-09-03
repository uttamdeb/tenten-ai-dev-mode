import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  num: number;
  question_raw: string;
  options_raw: string[];
  answer_letter: string;
  answer_bn: string;
  reason_bn: string;
}

interface QuizRendererProps {
  questions: QuizQuestion[];
}

export function QuizRenderer({ questions }: QuizRendererProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>({});

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionLetter
    }));
  };

  const handleShowResult = (questionIndex: number) => {
    setShowResults(prev => ({
      ...prev,
      [questionIndex]: true
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getOptionLabel = (index: number) => {
    return ['ক', 'খ', 'গ', 'ঘ'][index] || String.fromCharCode(97 + index);
  };

  const isCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const optionLetter = String.fromCharCode(65 + optionIndex);
    return question.answer_letter === optionLetter;
  };

  const isSelectedAnswer = (questionIndex: number, optionIndex: number) => {
    const optionLetter = String.fromCharCode(65 + optionIndex);
    return selectedAnswers[questionIndex] === optionLetter;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
          <span className="text-primary">✨</span>
          Quiz
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground leading-relaxed">
            {currentQuestion.question_raw}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options_raw.map((option, optionIndex) => {
              const isSelected = isSelectedAnswer(currentQuestionIndex, optionIndex);
              const isCorrect = isCorrectAnswer(currentQuestionIndex, optionIndex);
              const showingResult = showResults[currentQuestionIndex];
              
              return (
                <Button
                  key={optionIndex}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto p-4 text-wrap",
                    "border border-border hover:border-primary/50",
                    "bg-card hover:bg-accent/50",
                    {
                      "border-primary bg-primary/10": isSelected && !showingResult,
                      "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300": 
                        showingResult && isCorrect,
                      "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300": 
                        showingResult && isSelected && !isCorrect,
                    }
                  )}
                  onClick={() => !showingResult && handleAnswerSelect(currentQuestionIndex, optionIndex)}
                  disabled={showingResult}
                >
                  <span className="font-medium mr-2">{getOptionLabel(optionIndex)}.</span>
                  <span className="flex-1">{option.replace(/^[ক-ঘ]\.\s*/, '')}</span>
                </Button>
              );
            })}
          </div>

          {/* Show Answer Button */}
          {selectedAnswers[currentQuestionIndex] && !showResults[currentQuestionIndex] && (
            <Button 
              onClick={() => handleShowResult(currentQuestionIndex)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Show Answer
            </Button>
          )}

          {/* Answer Explanation */}
          {showResults[currentQuestionIndex] && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Correct Answer:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {currentQuestion.answer_bn}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {currentQuestion.reason_bn}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="text-sm font-medium text-muted-foreground">
            {currentQuestionIndex + 1}/{totalQuestions}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}