"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  Book,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  FileText,
  Video,
  Users,
  Settings,
  ShoppingCart,
  CreditCard,
  Package,
  BarChart3,
} from "lucide-react"
import { useState } from "react"

const helpCategories = [
  {
    title: "Getting Started",
    description: "Basic setup and first steps",
    icon: Book,
    articles: 12,
    color: "bg-blue-500",
  },
  {
    title: "POS Operations",
    description: "Processing orders and payments",
    icon: ShoppingCart,
    articles: 18,
    color: "bg-green-500",
  },
  {
    title: "Inventory Management",
    description: "Stock control and product management",
    icon: Package,
    articles: 15,
    color: "bg-purple-500",
  },
  {
    title: "Reports & Analytics",
    description: "Understanding your business data",
    icon: BarChart3,
    articles: 10,
    color: "bg-orange-500",
  },
  {
    title: "Payment Processing",
    description: "Card payments and transactions",
    icon: CreditCard,
    articles: 8,
    color: "bg-red-500",
  },
  {
    title: "System Settings",
    description: "Configuration and preferences",
    icon: Settings,
    articles: 14,
    color: "bg-indigo-500",
  },
]

const popularArticles = [
  { title: "How to process a refund", category: "POS Operations", views: 1234, difficulty: "Easy" },
  { title: "Setting up your first product", category: "Getting Started", views: 987, difficulty: "Easy" },
  { title: "Understanding sales reports", category: "Reports & Analytics", views: 756, difficulty: "Medium" },
  { title: "Managing low stock alerts", category: "Inventory Management", views: 654, difficulty: "Medium" },
  { title: "Configuring payment methods", category: "Payment Processing", views: 543, difficulty: "Advanced" },
]

const supportOptions = [
  {
    title: "Live Chat",
    description: "Get instant help from our support team",
    icon: MessageCircle,
    availability: "Available now",
    color: "bg-green-500",
  },
  {
    title: "Phone Support",
    description: "Call us for immediate assistance",
    icon: Phone,
    availability: "Mon-Fri 9AM-6PM",
    color: "bg-blue-500",
  },
  {
    title: "Email Support",
    description: "Send us your questions via email",
    icon: Mail,
    availability: "24/7 - Response within 4 hours",
    color: "bg-purple-500",
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step guides",
    icon: Video,
    availability: "Available anytime",
    color: "bg-orange-500",
  },
]

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 bg-white border-2 border-blue-200">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              C
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help Center</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Coffee & More - Get the support you need</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <HelpCircle className="h-3 w-3 mr-1" />
          24/7 Support
        </Badge>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg mb-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search for help articles, guides, or FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg bg-white dark:bg-gray-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card
                key={category.title}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${category.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{category.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {category.articles} articles
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Popular Articles */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Popular Articles
            </CardTitle>
            <CardDescription>Most viewed help articles this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularArticles.map((article, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{article.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{article.category}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          article.difficulty === "Easy"
                            ? "text-green-600 border-green-300"
                            : article.difficulty === "Medium"
                              ? "text-yellow-600 border-yellow-300"
                              : "text-red-600 border-red-300"
                        }
                      >
                        {article.difficulty}
                      </Badge>
                      <span className="text-xs text-gray-500">{article.views} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Contact Support
            </CardTitle>
            <CardDescription>Get personalized help from our team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportOptions.map((option) => {
                const Icon = option.icon
                return (
                  <div
                    key={option.title}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${option.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{option.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                        <p className="text-xs text-gray-500">{option.availability}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Contact
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Frequently accessed resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent">
              <Book className="h-6 w-6" />
              <span>User Manual</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent">
              <Video className="h-6 w-6" />
              <span>Video Tutorials</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent">
              <FileText className="h-6 w-6" />
              <span>Release Notes</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent">
              <MessageCircle className="h-6 w-6" />
              <span>Community Forum</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
