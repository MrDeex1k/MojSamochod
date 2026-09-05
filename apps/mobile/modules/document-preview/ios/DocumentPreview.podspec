Pod::Spec.new do |s|
  s.name           = 'DocumentPreview'
  s.version        = '1.0.0'
  s.summary        = 'Private PDF page rendering'
  s.description    = 'Renders managed PDF pages without external document actions.'
  s.author         = 'Moje Auto'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: 'https://github.com/MrDeex1k/MojSamochod' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
